# Product Review System

A backend API for managing product reviews, similar to Amazon or Alza. Customers can review products, and the system automatically maintains up-to-date average ratings using pessimistic locking to guarantee consistency under concurrent writes.

## Tech Stack

| Technology | Purpose |
|---|---|
| **NestJS** | Modular, opinionated Node.js framework with dependency injection |
| **TypeScript** | Type safety across the entire codebase; types extracted into separate files when shared |
| **Prisma** | Type-safe ORM with declarative schema and migrations. Uses Prisma 7 driver adapter model with `@prisma/adapter-pg` for PostgreSQL |
| **PostgreSQL** | Production database (also recommended for local dev via Docker) |
| **Zod** | Schema-first request validation with automatic TypeScript type inference — no decorator boilerplate |
| **Pino** | High-performance structured JSON logging with per-request `traceId` |
| **nestjs-cls** | Continuation-local storage for propagating `traceId` across async boundaries |
| **Helmet** | Sets security-related HTTP headers (`X-Content-Type-Options`, `Strict-Transport-Security`, etc.) |
| **JWT + Passport** | Stateless authentication via `@nestjs/jwt` and `@nestjs/passport` with bcrypt password hashing |
| **sanitize-html** | Input sanitization to prevent stored XSS attacks — strips dangerous HTML from user-generated content |

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
Would involve adding a `version` field to products and implementing retry logic.

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

### JWT Authentication

The system uses stateless JWT authentication with bcrypt password hashing (12 salt rounds).

**Flow:**
1. Customer registers via `POST /auth/register` (name, email, password) → receives JWT
2. Customer logs in via `POST /auth/login` (email, password) → receives JWT
3. JWT is sent as `Authorization: Bearer <token>` on protected endpoints
4. The `customerId` is extracted from the JWT `sub` claim — no more passing it in the request body

**Access Control:**
- **Public:** product browsing (`GET /products`), product detail, review listing (`GET /products/:id/reviews`), auth endpoints
- **Authenticated:** customer listing, product creation, review creation, review deletion
- **Owner-only:** review deletion (you can only delete your own reviews → 403 otherwise)

**Implementation Details:**
- `JwtAuthGuard` is registered globally via `APP_GUARD` — all routes require auth by default
- Routes marked with `@Public()` skip the guard
- `@CurrentUser()` decorator extracts the JWT payload for controllers
- `JwtStrategy` validates the token signature and expiration automatically

### XSS Protection via Input Sanitization

The system use `sanitize-html` defense-in-depth against stored XSS attacks by sanitizing all user-generated content before storage.

**Why this matters:**
- Since this is a JSON API, the backend itself isn't vulnerable to reflected XSS
- The risk is **stored XSS** — malicious content saved to the database and later rendered by frontends
- Backend sanitization ensures malicious content never reaches the database, protecting all current and future clients

**Additional protections:**
- **CSP headers** via Helmet — blocks inline scripts, restricts resource origins
- **Frontend responsibility** — clients should still use framework defaults (React auto-escapes) and never use `dangerouslySetInnerHTML` with user content

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

The API implements rate limiting using `@nestjs/throttler` to prevent abuse and review bombing attacks. Rate limits are **differentiated by authentication status**:

**Authenticated Users (tracked per user ID):**
- **Short-term**: 100 requests per second
- **Medium-term**: 1000 requests per minute
- **Long-term**: 5000 requests per 15 minutes

**Unauthenticated Users (tracked per IP + User-Agent):**
- Same limits as above, but shared across all users from the same IP/browser combo
- This affects public endpoints like product browsing and auth endpoints

**Stricter Limits for Abuse-Prone Public Endpoints:**

**Registration** (`POST /auth/register`):
- 3 per second (per IP)
- 20 per minute (per IP)
- 50 per 15 minutes (per IP)

**Login** (`POST /auth/login`):
- 5 per second (per IP)
- 30 per minute (per IP)
- 100 per 15 minutes (per IP)

When rate limits are exceeded, the API returns a `429 Too Many Requests` response.

#### Rate Limiting Strategy & Rationale

**Why Differentiate by Authentication?**

Authenticated users have accountability through their JWT, so they can be trusted with more generous limits. This solves several problems:

1. **No shared IP bottlenecks** - Each authenticated user gets their own quota, regardless of network
2. **Power users supported** - Legitimate users can browse/review extensively without hitting limits
3. **Attack surface reduced** - Abuse requires creating verified accounts (harder than IP rotation)
4. **Better UX** - Legitimate users behind corporate proxies/NATs aren't penalized

This means:
- Alice (authenticated) can make 100 req/sec even if she shares an IP with Bob
- Two users on public WiFi (unauthenticated) share the unauthenticated quota for that IP

**Auth Endpoints Stay Strict (Per-IP):**

Even though the global limits are generous, register/login endpoints override with strict per-IP limits to prevent:
- Brute force password attacks
- Mass account creation
- Credential stuffing

**Production Considerations:**

Rate limits should be adjusted based on production metrics:

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
| **No token refresh** | JWTs expire after 1h (configurable). No refresh token mechanism is implemented — clients must re-login. |
| **No role-based access** | All authenticated users have the same permissions. Admin roles (for product management) are not yet implemented. |

## Security

### Current Protection

The system implements security measures suitable for development and demonstration:

1. **JWT Authentication** - Stateless token-based auth with bcrypt password hashing (12 rounds)
2. **Ownership Enforcement** - Users can only delete their own reviews (403 otherwise)
3. **XSS Protection** - Input sanitization strips malicious HTML from all user-generated content
4. **Rate Limiting** - Prevents mass account creation and review bombing (see Rate Limiting section above)
4. **Input Validation** - Zod schemas validate all incoming data, preventing malformed requests
5. **Pagination Limits** - Maximum 100 items per page prevents resource exhaustion
6. **SQL Injection Protection** - Prisma's parameterized queries (`$queryRaw`) prevent SQL injection
7. **Security Headers** - Helmet sets standard HTTP security headers
8. **UUID Validation** - All ID parameters are validated as UUIDs

### Known Security Gaps

⚠️ **Remaining gaps for production readiness:**

- **No token refresh** - Clients must re-login after token expiry
- **No role-based access control** - All authenticated users have the same permissions
- **No email verification** - Disposable email services enable mass fake accounts
- **No bot protection** - No CAPTCHA or proof-of-work challenges
- **No abuse detection** - No automated flagging of suspicious patterns
- **No review moderation** - All reviews are published immediately without review

### Security Roadmap

The following improvements are should be added for production readiness, listed by priority:

**Email Verification**
- Send verification emails on registration (SendGrid/Mailgun)
- Block unverified accounts from creating reviews
- Add token-based email verification flow
- Estimated effort: 1-2 days

**Disposable Email Blocking**
- Maintain blocklist of known disposable email domains
- Reject registrations from throwaway email services

**Spam Detection in Reviews**
- Detect excessive repeated characters
- Block reviews containing URLs or promotional content
- Minimum review length (10 characters)
- Pattern-based spam detection

**CAPTCHA Integration**
- Add Google reCAPTCHA v3 to high-risk endpoints
- Conditionally require CAPTCHA based on trust score
- Challenge suspicious IPs automatically
- Estimated effort: 1 day

**Abuse Detection Dashboards**
- Query templates for detecting mass account creation
- Identify review bombing patterns
- Alert on suspicious activity (>10 accounts from same IP in 24h)
- Integration with Better Stack for alerts
- Estimated effort: 1-2 days


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

### Auth

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/auth/register` | Public | Register a new customer |
| `POST` | `/auth/login` | Public | Authenticate and receive JWT |

### Customers

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/customers/:id` | Required | Get customer by ID |
| `GET` | `/customers` | Required | List customers (paginated) |

### Products

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/products` | Required | Create a product |
| `GET` | `/products/:id` | Public | Get product by ID |
| `GET` | `/products` | Public | List products (paginated, sortable) |

### Reviews

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/products/:productId/reviews` | Required | Create a review (customerId from JWT) |
| `GET` | `/products/:productId/reviews` | Public | List reviews for a product |
| `GET` | `/me/reviews` | Required | List current user's reviews |
| `DELETE` | `/reviews/:id` | Required (owner) | Delete own review only |

All responses include the `X-Trace-Id` header. Protected endpoints require `Authorization: Bearer <token>`.

## Testing

```bash
# Run e2e tests (requires a running PostgreSQL instance)
npm run test:e2e
```

The e2e tests cover:
- Registration and login flow
- JWT-protected route enforcement (401 without token)
- Customer lookup (with passwordHash exclusion)
- Review creation with rating recalculation (customerId from JWT)
- Duplicate review rejection (409)
- Ownership-enforced deletion (403 for non-owner)
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
│   ├── auth/                      # Auth module (JWT, register, login)
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
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | — (required) |
| `JWT_EXPIRATION` | Token expiration time (e.g. `1h`, `30m`, `7d`) | `1h` |
| `LOG_LEVEL` | Pino log level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`) | `info` |
| `NODE_ENV` | Environment (`development`, `production`) | — |
