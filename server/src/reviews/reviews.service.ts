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

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    productId: string,
    customerId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponse> {
    const reviewId = crypto.randomUUID();
    const now = new Date();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const [product] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM products WHERE id = ${productId} FOR UPDATE
        `;
        if (!product) {
          throw new NotFoundException(
            `Product with id "${productId}" not found`,
          );
        }

        const [review] = await tx.$queryRaw<ReviewResponse[]>`
          INSERT INTO reviews (id, customer_id, product_id, rating, title, body, created_at, updated_at)
          VALUES (${reviewId}, ${customerId}, ${productId}, ${dto.rating}, ${dto.title ?? null}, ${dto.body}, ${now}, ${now})
          RETURNING id, rating, title, body, customer_id AS "customerId", product_id AS "productId", created_at AS "createdAt", updated_at AS "updatedAt"
        `;

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

        return review;
      });
    } catch (error) {
      const isPrismaUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002';
      const isPgUniqueViolation =
        error instanceof Error &&
        'code' in error &&
        (error as Record<string, unknown>).code === '23505';

      if (isPrismaUniqueViolation || isPgUniqueViolation) {
        throw new ConflictException(
          'Customer has already reviewed this product',
        );
      }
      throw error;
    }
  }

  async findByProduct(
    productId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<ReviewResponse>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByCustomer(
    customerId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<ReviewResponse>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { customerId } }),
    ]);

    return {
      data,
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
