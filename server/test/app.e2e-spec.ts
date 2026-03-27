import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { GlobalExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './../src/common/interceptors/logging.interceptor.js';
import { ClsService } from 'nestjs-cls';

import { JwtService } from '@nestjs/jwt';

interface AuthResult {
  accessToken: string;
  customer: { id: string; name: string; email: string };
}

/** Review JSON from POST /products/:id/reviews, GET list, GET /me/reviews — includes owner display fields. */
interface ReviewJson {
  id: string;
  customerId: string;
  customerName: string;
  rating: number;
  body: string;
  title?: string | null;
}

/** Must exist in DB (`npm run seed`). E2E does not create products (no POST /products). */
const E2E_PRODUCT_SKU = 'HDPH-001';

describe('Review System (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;

  async function productIdBySku(sku: string): Promise<string> {
    const row = await prisma.product.findUnique({ where: { sku } });
    if (!row) {
      throw new Error(`No product with sku "${sku}". Run: npm run seed`);
    }
    return row.id;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(app.get(Logger));
    app.use(helmet());

    const cls = app.get(ClsService);
    app.useGlobalFilters(new GlobalExceptionFilter(cls));
    app.useGlobalInterceptors(new LoggingInterceptor(cls));

    await app.init();

    httpServer = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.review.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.product.updateMany({
      data: { averageRating: 0, reviewCount: 0 },
    });
  });

  afterAll(async () => {
    await prisma.review.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.product.updateMany({
      data: { averageRating: 0, reviewCount: 0 },
    });
    await app.close();
  });

  async function register(
    name: string,
    email: string,
    password = 'Password1',
  ): Promise<AuthResult> {
    const res = await request(httpServer)
      .post('/auth/register')
      .send({ name, email, password })
      .expect(201);
    return res.body as AuthResult;
  }

  function authHeader(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  // --------------- Auth ---------------

  describe('Auth', () => {
    it('POST /auth/register - should register and return JWT', async () => {
      const res = await request(httpServer)
        .post('/auth/register')
        .send({ name: 'Alice', email: 'alice@test.com', password: 'Password1' })
        .expect(201);

      const body = res.body as AuthResult;
      expect(body.accessToken).toBeDefined();
      expect(body.customer.email).toBe('alice@test.com');
      expect(body.customer.id).toBeDefined();
      expect(
        (body.customer as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
    });

    it('POST /auth/register - should reject duplicate email with 409', async () => {
      await register('Alice', 'dup@test.com');

      const res = await request(httpServer)
        .post('/auth/register')
        .send({ name: 'Bob', email: 'dup@test.com', password: 'Password1' })
        .expect(409);

      expect((res.body as { message: string }).message).toContain(
        'already registered',
      );
    });

    it('POST /auth/register - should reject weak password with 422', async () => {
      await request(httpServer)
        .post('/auth/register')
        .send({ name: 'Alice', email: 'alice@test.com', password: 'weak' })
        .expect(422);
    });

    it('POST /auth/register - should reject password without complexity with 422', async () => {
      await request(httpServer)
        .post('/auth/register')
        .send({
          name: 'Alice',
          email: 'alice@test.com',
          password: 'alllowercase',
        })
        .expect(422);
    });

    it('POST /auth/login - should authenticate with valid credentials', async () => {
      await register('Alice', 'alice@test.com', 'MyPassword1');

      const res = await request(httpServer)
        .post('/auth/login')
        .send({ email: 'alice@test.com', password: 'MyPassword1' })
        .expect(200);

      const body = res.body as AuthResult;
      expect(body.accessToken).toBeDefined();
      expect(body.customer.email).toBe('alice@test.com');
    });

    it('POST /auth/login - should reject wrong password with 401', async () => {
      await register('Alice', 'alice@test.com', 'CorrectPass1');

      await request(httpServer)
        .post('/auth/login')
        .send({ email: 'alice@test.com', password: 'WrongPass1' })
        .expect(401);
    });

    it('POST /auth/login - should reject non-existent email with 401', async () => {
      await request(httpServer)
        .post('/auth/login')
        .send({ email: 'ghost@test.com', password: 'Password1' })
        .expect(401);
    });

    it('should return 401 for expired token', async () => {
      const jwt = app.get(JwtService);
      const token = jwt.sign(
        { sub: '00000000-0000-0000-0000-000000000000', email: 'x@y.com' },
        { expiresIn: '0s' },
      );
      await new Promise((r) => setTimeout(r, 1000));

      await request(httpServer)
        .get('/customers')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  // --------------- Protected Routes ---------------

  describe('Protected Routes', () => {
    it('should return 401 for protected routes without token', async () => {
      await request(httpServer).get('/customers').expect(401);
    });

    it('should return 401 for invalid token', async () => {
      await request(httpServer)
        .get('/customers')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should allow access to public routes without token', async () => {
      await request(httpServer).get('/products').expect(200);
    });
  });

  // --------------- Customers ---------------

  describe('Customers', () => {
    it('GET /customers/:id - should return customer without passwordHash', async () => {
      const auth = await register('Alice', 'alice@test.com');

      const res = await request(httpServer)
        .get(`/customers/${auth.customer.id}`)
        .set(authHeader(auth.accessToken))
        .expect(200);

      expect((res.body as { name: string }).name).toBe('Alice');
      expect(
        (res.body as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
    });

    it('GET /customers/:id - should return 404 for non-existent', async () => {
      const auth = await register('Alice', 'alice@test.com');

      await request(httpServer)
        .get('/customers/00000000-0000-0000-0000-000000000000')
        .set(authHeader(auth.accessToken))
        .expect(404);
    });

    it('GET /customers - should return paginated list', async () => {
      const auth = await register('A', 'a@test.com');
      await register('B', 'b@test.com');

      const res = await request(httpServer)
        .get('/customers?page=1&limit=1')
        .set(authHeader(auth.accessToken))
        .expect(200);

      expect((res.body as { data: unknown[] }).data).toHaveLength(1);
      expect((res.body as { meta: { total: number } }).meta.total).toBe(2);
    });
  });

  // --------------- Products ---------------

  describe('Products', () => {
    it('GET /products - should be publicly accessible and sortable', async () => {
      const res = await request(httpServer)
        .get('/products?sortBy=name&order=asc')
        .expect(200);

      const data = (res.body as { data: Array<{ name: string }> }).data;
      expect(data.length).toBeGreaterThanOrEqual(1);
      // Seeded catalog (see prisma/seed.ts): name ASC — leading digit sorts before letters
      expect(data[0].name).toBe('27" 4K Monitor');
    });
  });

  // --------------- Reviews ---------------

  describe('Reviews', () => {
    let auth: AuthResult;
    let productId: string;

    beforeEach(async () => {
      auth = await register('Reviewer', 'reviewer@test.com');
      productId = await productIdBySku(E2E_PRODUCT_SKU);
    });

    it('POST /products/:id/reviews - should create review from JWT user', async () => {
      const res = await request(httpServer)
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 4, title: 'Good', body: 'Solid experience overall.' })
        .expect(201);

      const created = res.body as ReviewJson;
      expect(created.rating).toBe(4);
      expect(created.customerId).toBe(auth.customer.id);
      expect(created.customerName).toBe('Reviewer');

      const prodRes = await request(httpServer)
        .get(`/products/${productId}`)
        .expect(200);

      expect(
        Number((prodRes.body as { averageRating: number }).averageRating),
      ).toBe(4);
      expect((prodRes.body as { reviewCount: number }).reviewCount).toBe(1);
    });

    it('should correctly recalculate average with multiple reviews', async () => {
      const auth2 = await register('Reviewer2', 'r2@test.com');

      const first = await request(httpServer)
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 5, body: 'Excellent!' })
        .expect(201);
      expect((first.body as ReviewJson).customerName).toBe('Reviewer');
      expect((first.body as ReviewJson).customerId).toBe(auth.customer.id);

      const second = await request(httpServer)
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth2.accessToken))
        .send({ rating: 3, body: 'Average.' })
        .expect(201);
      expect((second.body as ReviewJson).customerName).toBe('Reviewer2');
      expect((second.body as ReviewJson).customerId).toBe(auth2.customer.id);

      const listRes = await request(httpServer)
        .get(`/products/${productId}/reviews`)
        .expect(200);
      const items = (listRes.body as { data: ReviewJson[] }).data;
      expect(items).toHaveLength(2);
      const names = items.map((r) => r.customerName).sort();
      expect(names).toEqual(['Reviewer', 'Reviewer2']);
      for (const r of items) {
        expect(r.customerId).toBeDefined();
        expect(r.customerName).toBeDefined();
      }

      const prodRes = await request(httpServer)
        .get(`/products/${productId}`)
        .expect(200);

      expect(
        Number((prodRes.body as { averageRating: number }).averageRating),
      ).toBe(4);
      expect((prodRes.body as { reviewCount: number }).reviewCount).toBe(2);
    });

    it('should reject duplicate review (no second row for same customer + product)', async () => {
      const ok = await request(httpServer)
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 5, body: 'First review' })
        .expect(201);
      expect((ok.body as ReviewJson).customerName).toBe('Reviewer');
      expect((ok.body as ReviewJson).customerId).toBe(auth.customer.id);

      expect(
        await prisma.review.count({
          where: { customerId: auth.customer.id, productId },
        }),
      ).toBe(1);

      const res = await request(httpServer)
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 3, body: 'Duplicate attempt' });

      expect(res.status).toBe(409);
      expect((res.body as { code: string }).code).toBe('REVIEW_ALREADY_EXISTS');
      expect((res.body as { message: string }).message).toContain(
        'already reviewed',
      );
      expect(
        await prisma.review.count({
          where: { customerId: auth.customer.id, productId },
        }),
      ).toBe(1);
    });

    it('should reject invalid rating with 422', async () => {
      const res = await request(httpServer)
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 6, body: 'Bad rating' })
        .expect(422);

      expect((res.body as { errors: unknown[] }).errors).toBeDefined();
    });

    it('should reject review creation without auth', async () => {
      await request(httpServer)
        .post(`/products/${productId}/reviews`)
        .send({ rating: 5, body: 'No token' })
        .expect(401);
    });

    it('DELETE /reviews/:id - owner should be able to delete', async () => {
      const auth2 = await register('Reviewer2', 'r2@test.com');

      const r1 = await request(httpServer)
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 5, body: 'Five stars' })
        .expect(201);
      expect((r1.body as ReviewJson).customerName).toBe('Reviewer');

      await request(httpServer)
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth2.accessToken))
        .send({ rating: 3, body: 'Three stars' })
        .expect(201);

      await request(httpServer)
        .delete(`/reviews/${(r1.body as ReviewJson).id}`)
        .set(authHeader(auth.accessToken))
        .expect(204);

      const prodRes = await request(httpServer)
        .get(`/products/${productId}`)
        .expect(200);

      expect(
        Number((prodRes.body as { averageRating: number }).averageRating),
      ).toBe(3);
      expect((prodRes.body as { reviewCount: number }).reviewCount).toBe(1);
    });

    it('DELETE /reviews/:id - should reject non-owner with 403', async () => {
      const auth2 = await register('Other', 'other@test.com');

      const review = await request(httpServer)
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 5, body: 'My review' })
        .expect(201);
      expect((review.body as ReviewJson).customerName).toBe('Reviewer');

      await request(httpServer)
        .delete(`/reviews/${(review.body as ReviewJson).id}`)
        .set(authHeader(auth2.accessToken))
        .expect(403);
    });

    it('DELETE /reviews/:id - should return 404 for non-existent', async () => {
      await request(httpServer)
        .delete('/reviews/00000000-0000-0000-0000-000000000000')
        .set(authHeader(auth.accessToken))
        .expect(404);
    });

    it('GET /products/:id/reviews - should be publicly accessible', async () => {
      const created = await request(httpServer)
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 4, body: 'Nice product.' })
        .expect(201);
      expect((created.body as ReviewJson).customerName).toBe('Reviewer');

      const res = await request(httpServer)
        .get(`/products/${productId}/reviews`)
        .expect(200);

      const data = (res.body as { data: ReviewJson[]; meta: { total: number } })
        .data;
      expect(data).toHaveLength(1);
      expect(res.body as { meta: { total: number } }).toMatchObject({
        meta: { total: 1 },
      });
      expect(data[0].customerName).toBe('Reviewer');
      expect(data[0].customerId).toBe(auth.customer.id);
    });

    it('GET /me/reviews - should return authenticated user reviews', async () => {
      const created = await request(httpServer)
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 4, body: 'My review.' })
        .expect(201);
      expect((created.body as ReviewJson).customerName).toBe('Reviewer');

      const res = await request(httpServer)
        .get('/me/reviews')
        .set(authHeader(auth.accessToken))
        .expect(200);

      const data = (res.body as { data: ReviewJson[] }).data;
      expect(data).toHaveLength(1);
      expect(data[0].customerName).toBe('Reviewer');
      expect(data[0].customerId).toBe(auth.customer.id);
    });

    it('GET /me/reviews - should require auth', async () => {
      await request(httpServer).get('/me/reviews').expect(401);
    });
  });

  // --------------- Trace ID ---------------

  describe('Trace ID', () => {
    it('should return X-Trace-Id header on every response', async () => {
      const res = await request(httpServer).get('/products').expect(200);

      expect(res.headers['x-trace-id']).toBeDefined();
    });

    it('should echo client-provided X-Trace-Id', async () => {
      const traceId = 'test-trace-12345';
      const res = await request(httpServer)
        .get('/products')
        .set('x-trace-id', traceId)
        .expect(200);

      expect(res.headers['x-trace-id']).toBe(traceId);
    });
  });

  // --------------- Helmet ---------------

  describe('Security Headers', () => {
    it('should include Helmet security headers', async () => {
      const res = await request(httpServer).get('/products').expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
