# Product Review System

A backend API for managing product reviews, similar to Amazon or Alza. Customers can review products, and the system automatically maintains up-to-date average ratings using pessimistic locking to guarantee consistency under concurrent writes.

## Tech Stack

| Technology | Purpose |
|---|---|
| **NestJS** | Modular, opinionated Node.js framework with dependency injection |
| **TypeScript** | Type safety across the entire codebase; types extracted into separate files when shared |
| **Prisma** | Type-safe ORM with declarative schema and migrations |
| **PostgreSQL** | Production database (also recommended for local dev via Docker) |
| **Zod** | Schema-first request validation with automatic TypeScript type inference — no decorator boilerplate |
| **Pino** | High-performance structured JSON logging with per-request `traceId` |
| **nestjs-cls** | Continuation-local storage for propagating `traceId` across async boundaries |
| **Helmet** | Sets security-related HTTP headers (`X-Content-Type-Options`, `Strict-Transport-Security`, etc.) |

## Architecture Decisions

### Denormalized Average Rating

`averageRating` and `reviewCount` are stored directly on the `products` table rather than computed on every read. This avoids an expensive `AVG()` join on every product listing request. The trade-off is write-time complexity: every review creation or deletion must recalculate and update these fields atomically.

### Pessimistic Locking with `$queryRaw`

When a review is created or deleted, the system uses a pessimistic locking strategy to ensure rating accuracy under concurrent writes. Here's the detailed flow for review creation (`reviews.service.ts`):

#### Transaction Flow

**1. Transaction wrapper**
Everything executes within a Prisma transaction to ensure atomicity - either all operations succeed or none do.

**2. Lock the product row**
```sql
SELECT id FROM products WHERE id = ${productId} FOR UPDATE
```
Acquires a row-level lock on the product to prevent race conditions. If two reviews are being created simultaneously, one will wait until the other completes. This is critical for accurate rating calculations.

**3. Insert the review**
Raw SQL insert that returns the newly created review with all fields. Uses `RETURNING` to get the inserted data back in one query instead of a separate SELECT.

**4. Calculate new statistics**
Aggregates all reviews for this product:
- `AVG(rating)` - average rating across all reviews
- `COUNT(*)` - total number of reviews
- `COALESCE(..., 0)` - defaults to 0 if no reviews exist
- `::numeric(3,2)` - formats average to 2 decimal places

**5. Update product stats**
Updates the denormalized `average_rating` and `review_count` columns on the product table with the freshly calculated values.

**6. Log and return**
Logs the operation with new stats for observability and returns the created review.

#### Why Raw SQL?

The `FOR UPDATE` lock and the aggregation query with `RETURNING` are easier/more efficient with raw SQL. Prisma's query builder doesn't expose `FOR UPDATE`, making `$queryRaw` necessary for this pattern.

#### Pessimistic vs Optimistic Concurrency Control

**Why Pessimistic Locking (Current Approach)?**

Pros:
- **Guaranteed accuracy** - ratings are always correct, no chance of lost updates
- **Simple logic** - no retry loops or version checking needed
- **Good for moderate concurrency** - works well when products don't get hammered with simultaneous reviews
- **Short lock duration** - the lock is held briefly (just insert + aggregate + update)

Cons:
- **Blocking** - concurrent reviews for the same product wait in line
- **Potential bottleneck** - a popular product getting 10+ reviews/second would serialize all of them
- **Deadlock risk** - though not an issue in this specific implementation

**Optimistic Concurrency Control Alternative**

Would involve adding a `version` field to products and implementing retry logic:
```typescript
// Add version field to products table
const product = await tx.product.findUnique({ where: { id: productId } });
// Insert review, calculate stats
// Try to update product with version check
await tx.product.update({
  where: { id: productId, version: product.version },
  data: { averageRating: avg, reviewCount: cnt, version: { increment: 1 } }
});
// If update affects 0 rows, retry the whole transaction
```

Pros:
- **No blocking** - concurrent reviews can proceed in parallel
- **Better throughput** - under heavy concurrent load on the same product
- **No deadlocks**

Cons:
- **Retry complexity** - needs exponential backoff, max retries, error handling
- **Wasted work** - losing transactions throw away their computation
- **More complex** - harder to reason about and debug

**When to Switch to Optimistic:**
- If profiling shows the `FOR UPDATE` causing significant wait times
- If you have viral products regularly getting 10+ reviews per second
- If you can tolerate brief rating inconsistencies

For this review system, pessimistic locking is the right choice because most products won't get bombarded with simultaneous reviews, and rating accuracy is more important than theoretical throughput gains.

### Zod over class-validator

Zod provides schema-first validation where the TypeScript type is _inferred_ from the schema (`z.infer<typeof schema>`), eliminating the need for separate class definitions and decorator metadata (`reflect-metadata`). Schemas are composable — shared pagination fields are defined once in `common/dto/pagination.dto.ts` and extended by module-specific query DTOs via `.extend()`.

### Helmet

Registered globally in `main.ts` with default settings. Adds standard security headers with zero configuration:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Strict-Transport-Security` (HSTS)
- Removes `X-Powered-By`

### Pino + CLS for Structured Logging

Every request gets a UUID v4 `traceId` (generated by middleware or accepted from the `X-Trace-Id` header). This ID is stored in continuation-local storage and automatically mixed into every Pino log line, making it easy to correlate all logs for a single request.

### Rate Limiting

The API implements rate limiting using `@nestjs/throttler` to prevent abuse and review bombing attacks. Rate limits are enforced per IP + User-Agent combination to handle proxies and NAT while still blocking malicious actors.

**Global Limits (applies to all endpoints):**
- **Short-term**: 50 requests per second
- **Medium-term**: 500 requests per minute
- **Long-term**: 2000 requests per 15 minutes

**Stricter Limits for Abuse-Prone Endpoints:**

**Customer Creation** (`POST /customers`):
- 3 per second
- 20 per minute
- 50 per 15 minutes

**Review Creation** (`POST /products/:productId/reviews`):
- 5 per second
- 30 per minute
- 100 per 15 minutes

When rate limits are exceeded, the API returns a `429 Too Many Requests` response.

#### Rate Limiting Strategy & Rationale

**Why These Limits?**

The current limits balance security with user experience for a platform without authentication:

1. **Global Limits (50/sec, 500/min)** - Generous enough for legitimate browsing behavior
   - A user rapidly clicking through products won't hit these limits
   - Shared IPs (offices, universities, mobile carriers) can support multiple concurrent users
   - Still blocks obvious DDoS attempts (thousands of requests per second)

2. **Customer Creation Limits (3/sec, 20/min, 50/15min)** - Prevents mass fake accounts
   - **3/sec**: Allows legitimate users to quickly retry if first attempt fails
   - **20/min**: Permits legitimate scenarios (e.g., multiple people at a conference signing up)
   - **50/15min**: Blocks attackers trying to create hundreds of fake accounts
   - **Trade-off**: Shared IPs with many users (large office) might hit these limits during onboarding campaigns

3. **Review Creation Limits (5/sec, 30/min, 100/15min)** - Stops review bombing while allowing power users
   - **5/sec**: Accommodates legitimate power reviewers or testing scenarios
   - **30/min**: Allows users to review multiple products in a session
   - **100/15min**: Prevents review bombing while not blocking QA teams or beta testers
   - **Trade-off**: Extremely prolific reviewers (>100 reviews in 15min) will be throttled

**Tracking by IP + User-Agent**

The system tracks `${ip}-${userAgent}` to handle these scenarios:

✅ **Handles correctly:**
- Users behind corporate proxies (different User-Agents)
- Mobile users on carrier-grade NAT (different User-Agents from different devices)
- Multiple family members on home network (different browsers/devices)

❌ **Potential issues:**
- All users on same network with same browser version share limits
- VPN exit nodes aggregate unrelated users
- Privacy-focused browsers (same User-Agent) on shared networks

**Limitations Without Authentication**

These limits are **per-IP based** because there's no authentication. This means:

**Vulnerabilities:**
- Attackers can rotate IPs (VPNs, proxies, botnets) to bypass limits
- Legitimate users on problematic IPs (public WiFi, VPNs) may share limits with attackers
- Cannot distinguish between legitimate power users and abusers from same IP

**Future Improvements (See Security Roadmap):**

Once JWT authentication is implemented, the strategy will shift:

```typescript
// Unauthenticated endpoints - strict per-IP limits
POST /auth/register  → 2/sec, 10/min, 30/hour per IP

// Authenticated endpoints - generous per-user limits  
POST /products/:id/reviews → 10/sec, 100/min, 500/hour per user
```

Benefits of per-user rate limiting:
- **More generous limits** - Authenticated users have accountability
- **No shared IP issues** - Each user gets their own quota
- **Tiered limits** - New accounts get stricter limits than established ones
- **Better monitoring** - Track per-user patterns for abuse detection

**Monitoring & Tuning**

Rate limits should be adjusted based on production metrics:

```typescript
// Log rate limit hits to identify legitimate users being blocked
this.logger.warn('Rate limit exceeded', {
  ip,
  userAgent,
  endpoint: req.path,
  limit: throttlerLimitDetail.limit,
  timeWindow: throttlerLimitDetail.ttl,
});
```

**Adjust limits when:**
- Legitimate users report being blocked → Increase limits
- Abuse patterns emerge → Tighten specific endpoints
- Traffic spikes during campaigns → Temporarily relax limits
- Peak hours → Consider time-based dynamic limits

**Infrastructure-Level Protection**

For production deployments, consider additional layers:

1. **Cloudflare/CDN** - DDoS protection (10k+ req/sec per IP)
2. **Nginx rate limiting** - Protect against infrastructure overload
3. **Application rate limiting** (current) - Prevent business logic abuse
4. **Per-user quotas** (after auth) - Fine-grained abuse prevention

This multi-layer approach ensures legitimate traffic flows freely while blocking attacks at appropriate levels.

## Trade-offs and Known Limitations

| Concern | Detail |
|---|---|
| **SQLite incompatibility** | `SELECT ... FOR UPDATE` does not exist in SQLite. The pessimistic locking transaction only works against PostgreSQL. Use Docker for local dev. |
| **Prisma raw SQL coupling** | The review creation/deletion logic uses `$queryRaw` for the locking transaction. This bypasses Prisma's type-safe query builder and is PostgreSQL-specific. |
| **Decimal precision** | SQLite stores `Decimal` as `REAL` (floating point). PostgreSQL uses true `NUMERIC`. For this use case (3,2 precision), the practical impact is negligible. |
| **No authentication** | The system has no auth layer. `customerId` is passed in the request body. In production, this would come from a JWT or session. |
| **Rate limiting only** | While rate limiting is implemented, it's not a complete security solution. See the Security Roadmap section for production-ready improvements. |

## Security

### Current Protection

The system implements basic security measures suitable for development and demonstration:

1. **Rate Limiting** - Prevents mass account creation and review bombing (see Rate Limiting section above)
2. **Input Validation** - Zod schemas validate all incoming data, preventing malformed requests
3. **Pagination Limits** - Maximum 100 items per page prevents resource exhaustion
4. **SQL Injection Protection** - Prisma's parameterized queries (`$queryRaw`) prevent SQL injection
5. **Security Headers** - Helmet sets standard HTTP security headers
6. **UUID Validation** - All ID parameters are validated as UUIDs

### Known Security Gaps

⚠️ **This system is NOT production-ready from a security perspective.** Critical gaps include:

- **No authentication** - Anyone can create customers, submit reviews as any user, or delete any review
- **No email verification** - Disposable email services enable mass fake accounts
- **No bot protection** - No CAPTCHA or proof-of-work challenges
- **No abuse detection** - No automated flagging of suspicious patterns
- **No review moderation** - All reviews are published immediately without review

### Security Roadmap

The following improvements are planned for production readiness, listed by priority:

#### Phase 1: Authentication & Authorization (Critical)

**JWT Authentication System**
- Add password authentication for customers
- Implement JWT token-based sessions
- Extract `customerId` from JWT tokens instead of request body
- Add ownership checks (users can only delete their own reviews)
- Estimated effort: 2-3 days

**Implementation approach:**
```typescript
// After implementation:
POST /auth/register { email, password, name }
POST /auth/login { email, password } → returns JWT
POST /products/:id/reviews { rating, body } // customerId from JWT
DELETE /reviews/:id // ownership verified via JWT
```

**Email Verification**
- Send verification emails on registration (SendGrid/Mailgun)
- Block unverified accounts from creating reviews
- Add token-based email verification flow
- Estimated effort: 1-2 days

#### Phase 2: Enhanced Input Validation (High Priority)

**Disposable Email Blocking**
- Maintain blocklist of known disposable email domains
- Reject registrations from throwaway email services
- Estimated effort: 2-3 hours

**Spam Detection in Reviews**
- Detect excessive repeated characters
- Block reviews containing URLs or promotional content
- Minimum review length (10 characters)
- Pattern-based spam detection
- Estimated effort: 2-3 hours

#### Phase 3: Abuse Detection & Reputation (Medium Priority)

**IP Tracking & Forensics**
- Log IP addresses and User-Agents for all operations
- Add database indexes on IP fields
- Enable post-incident analysis
- Estimated effort: 4-6 hours

**Account Reputation System**
- Trust scoring based on account age, review patterns, and IP history
- Flag accounts created from IPs with multiple recent registrations
- Block or challenge low-trust accounts
- Estimated effort: 1-2 days

**Implementation approach:**
```typescript
// Trust score calculation factors:
- Account age (bonus for accounts >30 days old)
- Review frequency (penalty for >5 reviews in 24h)
- IP sharing (penalty if IP created >3 accounts in 7 days)
- Review count (suspicious if >50 total reviews)

// Actions based on trust score:
- Score < 20: Block action
- Score 20-40: Require CAPTCHA
- Score > 40: Allow
```

#### Phase 4: Review Moderation (Medium Priority)

**Automated Moderation Queue**
- Add review status: `PENDING`, `APPROVED`, `REJECTED`, `FLAGGED`
- Auto-approve low-risk reviews
- Flag suspicious reviews for manual review
- Auto-reject high-risk reviews (profanity, spam patterns)
- Only show approved reviews in public endpoints
- Estimated effort: 2-3 days

**Profanity & Content Filtering**
- Integrate profanity detection library
- Check for offensive content
- Flag reviews for manual moderation
- Estimated effort: 1 day

#### Phase 5: Bot Protection (Lower Priority)

**CAPTCHA Integration**
- Add Google reCAPTCHA v3 to high-risk endpoints
- Conditionally require CAPTCHA based on trust score
- Challenge suspicious IPs automatically
- Estimated effort: 1 day

#### Phase 6: Monitoring & Alerting (Operational)

**Abuse Detection Dashboards**
- Query templates for detecting mass account creation
- Identify review bombing patterns
- Alert on suspicious activity (>10 accounts from same IP in 24h)
- Integration with Better Stack for alerts
- Estimated effort: 1-2 days

**Automated Queries:**
```sql
-- Detect mass account creation from single IP
SELECT ip_address, COUNT(*) as accounts
FROM customers
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 5;

-- Detect review bombing patterns
SELECT ip_address, COUNT(*) as reviews
FROM reviews
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 10;
```

### Implementation Timeline

| Phase | Priority | Effort | Security Impact |
|-------|----------|--------|-----------------|
| Phase 1 | 🔴 Critical | 3-5 days | Eliminates identity spoofing, makes review bombing impractical |
| Phase 2 | 🟠 High | 4-6 hours | Blocks disposable emails and spam content |
| Phase 3 | 🟡 Medium | 1.5-2.5 days | Automated abuse detection, reputation-based blocking |
| Phase 4 | 🟡 Medium | 3-4 days | Prevents inappropriate content from appearing |
| Phase 5 | 🔵 Lower | 1 day | Blocks automated bot attacks |
| Phase 6 | 🟢 Operational | 1-2 days | Enables proactive monitoring |

**Total Estimated Effort:** 10-15 days for full production-ready security posture

### Testing Security Improvements

After implementing authentication and other security measures, test with:

```bash
# Test rate limiting
ab -n 1000 -c 50 http://localhost:3000/customers

# Test JWT authentication
curl -X POST http://localhost:3000/products/123/reviews \
  -H "Authorization: Bearer <invalid-token>" \
  # Should return 401 Unauthorized

# Test ownership checks
curl -X DELETE http://localhost:3000/reviews/<other-users-review-id> \
  -H "Authorization: Bearer <your-token>" \
  # Should return 403 Forbidden
```

### Security Best Practices for Deployment

When deploying to production:

1. **Environment Variables**
   - Use strong random `JWT_SECRET` (minimum 32 characters)
   - Never commit secrets to version control
   - Rotate secrets regularly (every 90 days)

2. **HTTPS Only**
   - Enforce HTTPS in production
   - Set `Strict-Transport-Security` header (already enabled via Helmet)
   - Use certificates from Let's Encrypt or similar

3. **Database Security**
   - Use connection pooling
   - Enable SSL for database connections
   - Restrict database user permissions (no DDL in production)

4. **Logging & Monitoring**
   - Log all authentication attempts
   - Monitor for unusual patterns (multiple failed logins, mass operations)
   - Set up alerts for security events
   - Retain logs for forensic analysis (90 days minimum)

5. **Rate Limiting at Infrastructure Level**
   - Consider adding Cloudflare or nginx rate limiting
   - Provides additional protection layer
   - Can block attacks before they reach the application

## Prerequisites

- **Docker** (for PostgreSQL)
- **Node.js** >= 20
- **npm** >= 10

## Getting Started

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Configure environment
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Generate Prisma client
npx prisma generate

# 5. Run database migrations
npx prisma migrate dev

# 6. Seed the database (optional)
npx prisma db seed

# 7. Start the development server
npm run start:dev
```

The API will be available at `http://localhost:3000`.

## API Overview

### Customers

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/customers` | Create a customer |
| `GET` | `/customers/:id` | Get customer by ID |
| `GET` | `/customers` | List customers (paginated) |

### Products

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/products` | Create a product |
| `GET` | `/products/:id` | Get product by ID |
| `GET` | `/products` | List products (paginated, sortable) |

### Reviews

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/products/:productId/reviews` | Create a review |
| `GET` | `/products/:productId/reviews` | List reviews for a product |
| `GET` | `/customers/:customerId/reviews` | List reviews by a customer |
| `DELETE` | `/reviews/:id` | Delete a review |

All responses include the `X-Trace-Id` header.

## Testing

```bash
# Run e2e tests (requires a running PostgreSQL instance)
npm run test:e2e
```

The e2e tests cover:
- Customer and product CRUD
- Review creation with rating recalculation
- Duplicate review rejection (409)
- Rating recalculation after deletion
- Zod validation errors (422)
- Trace ID propagation
- Helmet security headers

## Project Structure

```
cloudtalk/
├── prisma/
│   ├── schema.prisma              # Database schema (models, indexes, constraints)
│   └── seed.ts                    # Sample data for development
├── src/
│   ├── main.ts                    # App bootstrap (Pino, Helmet, global pipes)
│   ├── app.module.ts              # Root module
│   ├── common/
│   │   ├── middleware/             # TraceIdMiddleware
│   │   ├── interceptors/          # LoggingInterceptor
│   │   ├── filters/               # GlobalExceptionFilter
│   │   ├── pipes/                 # ZodValidationPipe
│   │   ├── dto/                   # Shared Zod schemas (pagination)
│   │   ├── decorators/            # @TraceId() param decorator
│   │   └── types/                 # Shared interfaces
│   ├── config/                    # App config + logger config
│   ├── prisma/                    # PrismaModule + PrismaService (global)
│   ├── customers/                 # Customers module
│   ├── products/                  # Products module
│   └── reviews/                   # Reviews module (with pessimistic locking)
├── test/                          # E2E tests
├── docker-compose.yml             # PostgreSQL 16
└── .env.example                   # Environment template
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://cloudtalk:cloudtalk@localhost:5432/cloudtalk?schema=public` |
| `PORT` | Server port | `3000` |
| `LOG_LEVEL` | Pino log level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`) | `info` |
| `NODE_ENV` | Environment (`development`, `production`) | — |
