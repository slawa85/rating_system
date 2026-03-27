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

## Trade-offs and Known Limitations

| Concern | Detail |
|---|---|
| **SQLite incompatibility** | `SELECT ... FOR UPDATE` does not exist in SQLite. The pessimistic locking transaction only works against PostgreSQL. Use Docker for local dev. |
| **Prisma raw SQL coupling** | The review creation/deletion logic uses `$queryRaw` for the locking transaction. This bypasses Prisma's type-safe query builder and is PostgreSQL-specific. |
| **Decimal precision** | SQLite stores `Decimal` as `REAL` (floating point). PostgreSQL uses true `NUMERIC`. For this use case (3,2 precision), the practical impact is negligible. |
| **No authentication** | The system has no auth layer. `customerId` is passed in the request body. In production, this would come from a JWT or session. |

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
