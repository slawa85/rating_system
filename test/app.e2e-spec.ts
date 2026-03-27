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

  // --------------- Customers ---------------

  describe('Customers', () => {
    it('POST /customers - should create a customer', async () => {
      const res = await request(app.getHttpServer())
        .post('/customers')
        .send({ name: 'Alice', email: 'alice@test.com' })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'Alice',
        email: 'alice@test.com',
      });
      expect((res.body as { id: string }).id).toBeDefined();
      expect(res.headers['x-trace-id']).toBeDefined();
    });

    it('POST /customers - should reject duplicate email with 409', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .send({ name: 'Alice', email: 'dup@test.com' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/customers')
        .send({ name: 'Bob', email: 'dup@test.com' })
        .expect(409);

      expect((res.body as { message: string }).message).toContain(
        'already exists',
      );
    });

    it('POST /customers - should reject invalid body with 422', async () => {
      const res = await request(app.getHttpServer())
        .post('/customers')
        .send({ name: '', email: 'bad' })
        .expect(422);

      expect((res.body as { errors: unknown[] }).errors).toBeDefined();
      expect((res.body as { errors: unknown[] }).errors.length).toBeGreaterThan(
        0,
      );
    });

    it('GET /customers/:id - should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .get('/customers/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('GET /customers - should return paginated list', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .send({ name: 'A', email: 'a@test.com' });
      await request(app.getHttpServer())
        .post('/customers')
        .send({ name: 'B', email: 'b@test.com' });

      const res = await request(app.getHttpServer())
        .get('/customers?page=1&limit=1')
        .expect(200);

      expect((res.body as { data: unknown[] }).data).toHaveLength(1);
      expect((res.body as { meta: { total: number } }).meta.total).toBe(2);
      expect(
        (res.body as { meta: { totalPages: number } }).meta.totalPages,
      ).toBe(2);
    });
  });

  // --------------- Products ---------------

  describe('Products', () => {
    it('POST /products - should create a product', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          sku: 'TEST-001',
          name: 'Test Product',
          description: 'A test product',
        })
        .expect(201);

      expect((res.body as { name: string }).name).toBe('Test Product');
      expect((res.body as { sku: string }).sku).toBe('TEST-001');
      expect((res.body as { reviewCount: number }).reviewCount).toBe(0);
    });

    it('POST /products - should reject duplicate SKU with 409', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({ sku: 'DUP-SKU', name: 'First' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/products')
        .send({ sku: 'DUP-SKU', name: 'Second' })
        .expect(409);

      expect((res.body as { message: string }).message).toContain(
        'already exists',
      );
    });

    it('GET /products - should sort by name', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({ sku: 'LOW-001', name: 'Low Rated' });
      await request(app.getHttpServer())
        .post('/products')
        .send({ sku: 'HIGH-001', name: 'High Rated' });

      const res = await request(app.getHttpServer())
        .get('/products?sortBy=name&order=asc')
        .expect(200);

      expect((res.body as { data: Array<{ name: string }> }).data[0].name).toBe(
        'High Rated',
      );
    });
  });

  // --------------- Reviews ---------------

  describe('Reviews', () => {
    let customerId: string;
    let productId: string;

    beforeEach(async () => {
      const customerRes = await request(app.getHttpServer())
        .post('/customers')
        .send({ name: 'Reviewer', email: 'reviewer@test.com' });
      customerId = (customerRes.body as { id: string }).id;

      const productRes = await request(app.getHttpServer())
        .post('/products')
        .send({ sku: `REV-${Date.now()}`, name: 'Reviewed Product' });
      productId = (productRes.body as { id: string }).id;
    });

    it('POST /products/:id/reviews - should create review and update rating', async () => {
      const res = await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .send({
          customerId,
          rating: 4,
          title: 'Good',
          body: 'Solid experience overall.',
        })
        .expect(201);

      expect((res.body as { rating: number }).rating).toBe(4);
      expect((res.body as { productId: string }).productId).toBe(productId);

      const prodRes = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(
        Number((prodRes.body as { averageRating: number }).averageRating),
      ).toBe(4);
      expect((prodRes.body as { reviewCount: number }).reviewCount).toBe(1);
    });

    it('should correctly recalculate average with multiple reviews', async () => {
      const c2 = await request(app.getHttpServer())
        .post('/customers')
        .send({ name: 'Reviewer2', email: 'r2@test.com' });

      await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .send({ customerId, rating: 5, body: 'Excellent!' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .send({
          customerId: (c2.body as { id: string }).id,
          rating: 3,
          body: 'Average.',
        })
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
        .send({ customerId, rating: 5, body: 'First review' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .send({ customerId, rating: 3, body: 'Duplicate attempt' })
        .expect(409);

      expect((res.body as { message: string }).message).toContain(
        'already reviewed',
      );
    });

    it('should reject invalid rating with 422', async () => {
      const res = await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .send({ customerId, rating: 6, body: 'Bad rating' })
        .expect(422);

      expect((res.body as { errors: unknown[] }).errors).toBeDefined();
    });

    it('should return 404 for non-existent customer', async () => {
      await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .send({
          customerId: '00000000-0000-0000-0000-000000000000',
          rating: 5,
          body: 'Ghost customer',
        })
        .expect(404);
    });

    it('DELETE /reviews/:id - should delete and recalculate rating', async () => {
      const c2 = await request(app.getHttpServer())
        .post('/customers')
        .send({ name: 'Reviewer2', email: 'r2@test.com' });

      const r1 = await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .send({ customerId, rating: 5, body: 'Five stars' });

      await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .send({
          customerId: (c2.body as { id: string }).id,
          rating: 3,
          body: 'Three stars',
        });

      await request(app.getHttpServer())
        .delete(`/reviews/${(r1.body as { id: string }).id}`)
        .expect(204);

      const prodRes = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(
        Number((prodRes.body as { averageRating: number }).averageRating),
      ).toBe(3);
      expect((prodRes.body as { reviewCount: number }).reviewCount).toBe(1);
    });

    it('GET /products/:id/reviews - should list reviews for product', async () => {
      await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .send({ customerId, rating: 4, body: 'Nice product.' });

      const res = await request(app.getHttpServer())
        .get(`/products/${productId}/reviews`)
        .expect(200);

      expect((res.body as { data: unknown[] }).data).toHaveLength(1);
      expect((res.body as { meta: { total: number } }).meta.total).toBe(1);
    });

    it('GET /customers/:id/reviews - should list reviews by customer', async () => {
      await request(app.getHttpServer())
        .post(`/products/${productId}/reviews`)
        .send({ customerId, rating: 4, body: 'Nice product.' });

      const res = await request(app.getHttpServer())
        .get(`/customers/${customerId}/reviews`)
        .expect(200);

      expect((res.body as { data: unknown[] }).data).toHaveLength(1);
    });
  });

  // --------------- Trace ID ---------------

  describe('Trace ID', () => {
    it('should return X-Trace-Id header on every response', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers')
        .expect(200);

      expect(res.headers['x-trace-id']).toBeDefined();
    });

    it('should echo client-provided X-Trace-Id', async () => {
      const traceId = 'test-trace-12345';
      const res = await request(app.getHttpServer())
        .get('/customers')
        .set('x-trace-id', traceId)
        .expect(200);

      expect(res.headers['x-trace-id']).toBe(traceId);
    });
  });

  // --------------- Helmet ---------------

  describe('Security Headers', () => {
    it('should include Helmet security headers', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers')
        .expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
