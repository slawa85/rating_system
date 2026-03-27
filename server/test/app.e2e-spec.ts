import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
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

describe('Review System (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.review.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.review.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.product.deleteMany();
    await app.close();
  });

  async function register(
    name: string,
    email: string,
    password = 'Password1',
  ): Promise<AuthResult> {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name, email, password })
      .expect(201);
    return res.body as AuthResult;
  }

  async function login(
    email: string,
    password = 'Password1',
  ): Promise<AuthResult> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body as AuthResult;
  }

  function authHeader(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  // --------------- Auth ---------------

  describe('Auth', () => {
    it('POST /auth/register - should register and return JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Alice', email: 'alice@test.com', password: 'Password1' })
        .expect(201);

      const body = res.body as AuthResult;
      expect(body.accessToken).toBeDefined();
      expect(body.customer.email).toBe('alice@test.com');
      expect(body.customer.id).toBeDefined();
      expect((body.customer as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('POST /auth/register - should reject duplicate email with 409', async () => {
      await register('Alice', 'dup@test.com');

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Bob', email: 'dup@test.com', password: 'Password1' })
        .expect(409);

      expect((res.body as { message: string }).message).toContain(
        'already exists',
      );
    });

    it('POST /auth/register - should reject weak password with 422', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Alice', email: 'alice@test.com', password: 'weak' })
        .expect(422);
    });

    it('POST /auth/register - should reject password without complexity with 422', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Alice', email: 'alice@test.com', password: 'alllowercase' })
        .expect(422);
    });

    it('POST /auth/login - should authenticate with valid credentials', async () => {
      await register('Alice', 'alice@test.com', 'MyPassword1');

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@test.com', password: 'MyPassword1' })
        .expect(200);

      const body = res.body as AuthResult;
      expect(body.accessToken).toBeDefined();
      expect(body.customer.email).toBe('alice@test.com');
    });

    it('POST /auth/login - should reject wrong password with 401', async () => {
      await register('Alice', 'alice@test.com', 'CorrectPass1');

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@test.com', password: 'WrongPass1' })
        .expect(401);
    });

    it('POST /auth/login - should reject non-existent email with 401', async () => {
      await request(app.getHttpServer())
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

      await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  // --------------- Protected Routes ---------------

  describe('Protected Routes', () => {
    it('should return 401 for protected routes without token', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({ sku: 'TEST-001', name: 'Test' })
        .expect(401);
    });

    it('should return 401 for invalid token', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', 'Bearer invalid-token')
        .send({ sku: 'TEST-001', name: 'Test' })
        .expect(401);
    });

    it('should allow access to public routes without token', async () => {
      await request(app.getHttpServer()).get('/products').expect(200);
    });
  });

  // --------------- Customers ---------------

  describe('Customers', () => {
    it('GET /customers/:id - should return customer without passwordHash', async () => {
      const auth = await register('Alice', 'alice@test.com');

      const res = await request(app.getHttpServer())
        .get(`/customers/${auth.customer.id}`)
        .set(authHeader(auth.accessToken))
        .expect(200);

      expect((res.body as { name: string }).name).toBe('Alice');
      expect((res.body as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('GET /customers/:id - should return 404 for non-existent', async () => {
      const auth = await register('Alice', 'alice@test.com');

      await request(app.getHttpServer())
        .get('/customers/00000000-0000-0000-0000-000000000000')
        .set(authHeader(auth.accessToken))
        .expect(404);
    });

    it('GET /customers - should return paginated list', async () => {
      const auth = await register('A', 'a@test.com');
      await register('B', 'b@test.com');

      const res = await request(app.getHttpServer())
        .get('/customers?page=1&limit=1')
        .set(authHeader(auth.accessToken))
        .expect(200);

      expect((res.body as { data: unknown[] }).data).toHaveLength(1);
      expect((res.body as { meta: { total: number } }).meta.total).toBe(2);
    });
  });

  // --------------- Products ---------------

  describe('Products', () => {
    it('POST /products - should create a product (authenticated)', async () => {
      const auth = await register('Alice', 'alice@test.com');

      const res = await request(app.getHttpServer())
        .post('/products')
        .set(authHeader(auth.accessToken))
        .send({
          sku: 'TEST-001',
          name: 'Test Product',
          description: 'A test product',
        })
        .expect(201);

      expect((res.body as { name: string }).name).toBe('Test Product');
      expect((res.body as { sku: string }).sku).toBe('TEST-001');
    });

    it('POST /products - should reject duplicate SKU with 409', async () => {
      const auth = await register('Alice', 'alice@test.com');

      await request(app.getHttpServer())
        .post('/products')
        .set(authHeader(auth.accessToken))
        .send({ sku: 'DUP-SKU', name: 'First' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/products')
        .set(authHeader(auth.accessToken))
        .send({ sku: 'DUP-SKU', name: 'Second' })
        .expect(409);

      expect((res.body as { message: string }).message).toContain(
        'already exists',
      );
    });

    it('GET /products - should be publicly accessible and sortable', async () => {
      const auth = await register('Alice', 'alice@test.com');

      await request(app.getHttpServer())
        .post('/products')
        .set(authHeader(auth.accessToken))
        .send({ sku: 'LOW-001', name: 'Low Rated' });
      await request(app.getHttpServer())
        .post('/products')
        .set(authHeader(auth.accessToken))
        .send({ sku: 'HIGH-001', name: 'High Rated' });

      const res = await request(app.getHttpServer())
        .get('/products?sortBy=name&order=asc')
        .expect(200);

      expect(
        (res.body as { data: Array<{ name: string }> }).data[0].name,
      ).toBe('High Rated');
    });
  });

  // --------------- Reviews ---------------

  describe('Reviews', () => {
    let auth: AuthResult;
    let productId: string;

    beforeEach(async () => {
      auth = await register('Reviewer', 'reviewer@test.com');

      const productRes = await request(app.getHttpServer())
        .post('/products')
        .set(authHeader(auth.accessToken))
        .send({ sku: `REV-${Date.now()}`, name: 'Reviewed Product' });
      productId = (productRes.body as { id: string }).id;
    });

    it('POST /products/:id/reviews - should create review from JWT user', async () => {
      const res = await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 4, title: 'Good', body: 'Solid experience overall.' })
        .expect(201);

      expect((res.body as { rating: number }).rating).toBe(4);
      expect((res.body as { customerId: string }).customerId).toBe(
        auth.customer.id,
      );

      const prodRes = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(
        Number((prodRes.body as { averageRating: number }).averageRating),
      ).toBe(4);
      expect((prodRes.body as { reviewCount: number }).reviewCount).toBe(1);
    });

    it('should correctly recalculate average with multiple reviews', async () => {
      const auth2 = await register('Reviewer2', 'r2@test.com');

      await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 5, body: 'Excellent!' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth2.accessToken))
        .send({ rating: 3, body: 'Average.' })
        .expect(201);

      const prodRes = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(
        Number((prodRes.body as { averageRating: number }).averageRating),
      ).toBe(4);
      expect((prodRes.body as { reviewCount: number }).reviewCount).toBe(2);
    });

    it('should reject duplicate review with 409', async () => {
      await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 5, body: 'First review' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 3, body: 'Duplicate attempt' })
        .expect(409);

      expect((res.body as { message: string }).message).toContain(
        'already reviewed',
      );
    });

    it('should reject invalid rating with 422', async () => {
      const res = await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 6, body: 'Bad rating' })
        .expect(422);

      expect((res.body as { errors: unknown[] }).errors).toBeDefined();
    });

    it('should reject review creation without auth', async () => {
      await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .send({ rating: 5, body: 'No token' })
        .expect(401);
    });

    it('DELETE /reviews/:id - owner should be able to delete', async () => {
      const auth2 = await register('Reviewer2', 'r2@test.com');

      const r1 = await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 5, body: 'Five stars' });

      await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth2.accessToken))
        .send({ rating: 3, body: 'Three stars' });

      await request(app.getHttpServer())
        .delete(`/reviews/${(r1.body as { id: string }).id}`)
        .set(authHeader(auth.accessToken))
        .expect(204);

      const prodRes = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(
        Number((prodRes.body as { averageRating: number }).averageRating),
      ).toBe(3);
      expect((prodRes.body as { reviewCount: number }).reviewCount).toBe(1);
    });

    it('DELETE /reviews/:id - should reject non-owner with 403', async () => {
      const auth2 = await register('Other', 'other@test.com');

      const review = await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 5, body: 'My review' });

      await request(app.getHttpServer())
        .delete(`/reviews/${(review.body as { id: string }).id}`)
        .set(authHeader(auth2.accessToken))
        .expect(403);
    });

    it('DELETE /reviews/:id - should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .delete('/reviews/00000000-0000-0000-0000-000000000000')
        .set(authHeader(auth.accessToken))
        .expect(404);
    });

    it('GET /products/:id/reviews - should be publicly accessible', async () => {
      await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 4, body: 'Nice product.' });

      const res = await request(app.getHttpServer())
        .get(`/products/${productId}/reviews`)
        .expect(200);

      expect((res.body as { data: unknown[] }).data).toHaveLength(1);
      expect((res.body as { meta: { total: number } }).meta.total).toBe(1);
    });

    it('GET /me/reviews - should return authenticated user reviews', async () => {
      await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .set(authHeader(auth.accessToken))
        .send({ rating: 4, body: 'My review.' });

      const res = await request(app.getHttpServer())
        .get('/me/reviews')
        .set(authHeader(auth.accessToken))
        .expect(200);

      expect((res.body as { data: unknown[] }).data).toHaveLength(1);
    });

    it('GET /me/reviews - should require auth', async () => {
      await request(app.getHttpServer()).get('/me/reviews').expect(401);
    });
  });

  // --------------- Trace ID ---------------

  describe('Trace ID', () => {
    it('should return X-Trace-Id header on every response', async () => {
      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(res.headers['x-trace-id']).toBeDefined();
    });

    it('should echo client-provided X-Trace-Id', async () => {
      const traceId = 'test-trace-12345';
      const res = await request(app.getHttpServer())
        .get('/products')
        .set('x-trace-id', traceId)
        .expect(200);

      expect(res.headers['x-trace-id']).toBe(traceId);
    });
  });

  // --------------- Helmet ---------------

  describe('Security Headers', () => {
    it('should include Helmet security headers', async () => {
      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
