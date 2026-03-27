import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { PaginationQuery } from '../common/dto/pagination.dto.js';
import { PaginatedResponse } from '../common/types/pagination.types.js';
import { ReviewResponse } from './types/review.types.js';
import { Prisma } from '../../generated/prisma/client/client.js';

/** API error `code` for 409 duplicate review; frontend must use the same string. */
const REVIEW_ALREADY_EXISTS = 'REVIEW_ALREADY_EXISTS';

type ReviewRatingAggregateRow = {
  rating: number;
  _count: { _all: number };
};

/** Same shape as `RatingDistributionCounts` in review.types.ts (defined here so typed-eslint resolves it; imported alias can become `error` with `NodeNext` + `.js` specifiers). */
type RatingDistributionPayload = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

type ReviewRowFromDb = Omit<ReviewResponse, 'customerName'>;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private toReviewResponse(
    row: ReviewRowFromDb & { customer: { name: string } },
  ): ReviewResponse {
    return {
      id: row.id,
      rating: row.rating,
      title: row.title,
      body: row.body,
      customerId: row.customerId,
      productId: row.productId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customerName: row.customer.name,
    };
  }

  async create(
    productId: string,
    customerId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponse> {
    const existing = await this.prisma.review.findUnique({
      where: {
        customerId_productId: { customerId, productId },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        message: 'You have already reviewed this product.',
        code: REVIEW_ALREADY_EXISTS,
      });
    }

    const reviewId = crypto.randomUUID();
    const now = new Date();

    try {
      const review = await this.prisma.$transaction(async (tx) => {
        const [product] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM products WHERE id = ${productId} FOR UPDATE
        `;
        if (!product) {
          throw new NotFoundException(
            `Product with id "${productId}" not found`,
          );
        }

        const [row] = await tx.$queryRaw<ReviewRowFromDb[]>`
          INSERT INTO reviews (id, customer_id, product_id, rating, title, body, created_at, updated_at)
          VALUES (${reviewId}, ${customerId}, ${productId}, ${dto.rating}, ${dto.title ?? null}, ${dto.body}, ${now}, ${now})
          RETURNING id, rating, title, body, customer_id AS "customerId", product_id AS "productId", created_at AS "createdAt", updated_at AS "updatedAt"
        `;
        if (!row) {
          throw new Error('Review insert returned no row');
        }

        const [stats] = await tx.$queryRaw<{ avg: string; cnt: number }[]>`
          SELECT
            COALESCE(AVG(rating)::numeric(3,2), 0) AS avg,
            COUNT(*)::int AS cnt
          FROM reviews
          WHERE product_id = ${productId}
        `;

        const avg = Number(stats.avg);
        const cnt = Number(stats.cnt);

        await tx.$queryRaw`
          UPDATE products
          SET average_rating = ${avg}, review_count = ${cnt}, updated_at = ${now}
          WHERE id = ${productId}
        `;

        this.logger.log(
          `Review created for product ${productId}: new avg=${avg}, count=${cnt}`,
        );

        return row;
      });

      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { name: true },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with id "${customerId}" not found`,
        );
      }

      return this.toReviewResponse({
        ...review,
        customer: { name: customer.name },
      });
    } catch (error) {
      const isPrismaUnique =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' ||
          error.message.includes('23505') ||
          /duplicate key|unique constraint/i.test(error.message));

      const isPgUniqueViolation =
        error instanceof Error &&
        'code' in error &&
        (error as Record<string, unknown>).code === '23505';

      if (isPrismaUnique || isPgUniqueViolation) {
        throw new ConflictException({
          message: 'You have already reviewed this product.',
          code: REVIEW_ALREADY_EXISTS,
        });
      }
      throw error;
    }
  }

  async getRatingDistribution(productId: string): Promise<{
    ratingDistribution: RatingDistributionPayload;
  }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }

    const grouped = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { productId },
      _count: { _all: true },
    });

    const ratingDistribution: RatingDistributionPayload = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    for (const row of grouped) {
      const { rating, _count } = row as ReviewRatingAggregateRow;
      ratingDistribution[rating as keyof RatingDistributionPayload] =
        _count._all;
    }

    return { ratingDistribution };
  }

  async findByProduct(
    productId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<ReviewResponse>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
        },
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    return {
      data: rows.map((r) => this.toReviewResponse(r)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByCustomer(
    customerId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<ReviewResponse>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
        },
      }),
      this.prisma.review.count({ where: { customerId } }),
    ]);

    return {
      data: rows.map((r) => this.toReviewResponse(r)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async remove(id: string, customerId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.findUnique({ where: { id } });
      if (!review) {
        throw new NotFoundException(`Review with id "${id}" not found`);
      }

      if (review.customerId !== customerId) {
        throw new ForbiddenException('You can only delete your own reviews');
      }

      const now = new Date();

      await tx.$queryRaw`
        SELECT id FROM products WHERE id = ${review.productId} FOR UPDATE
      `;

      await tx.review.delete({ where: { id } });

      const [stats] = await tx.$queryRaw<{ avg: string; cnt: number }[]>`
        SELECT
          COALESCE(AVG(rating)::numeric(3,2), 0) AS avg,
          COUNT(*)::int AS cnt
        FROM reviews
        WHERE product_id = ${review.productId}
      `;

      const avg = Number(stats.avg);
      const cnt = Number(stats.cnt);

      await tx.$queryRaw`
        UPDATE products
        SET average_rating = ${avg}, review_count = ${cnt}, updated_at = ${now}
        WHERE id = ${review.productId}
      `;

      this.logger.log(
        `Review ${id} deleted from product ${review.productId}: new avg=${avg}, count=${cnt}`,
      );
    });
  }
}
