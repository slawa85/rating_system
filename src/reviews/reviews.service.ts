import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { PaginationQuery } from '../common/dto/pagination.dto.js';
import { PaginatedResponse } from '../common/types/pagination.types.js';
import { ReviewResponse } from './types/review.types.js';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    businessId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponse> {
    await this.prisma.customer.findUniqueOrThrow({
      where: { id: dto.customerId },
    }).catch(() => {
      throw new NotFoundException(
        `Customer with id "${dto.customerId}" not found`,
      );
    });

    await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    }).catch(() => {
      throw new NotFoundException(
        `Business with id "${businessId}" not found`,
      );
    });

    const reviewId = uuidv4();
    const now = new Date();

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Pessimistic lock on the business row
        await tx.$queryRaw`
          SELECT id FROM businesses WHERE id = ${businessId} FOR UPDATE
        `;

        // Insert the review
        const [review] = await tx.$queryRaw<ReviewResponse[]>`
          INSERT INTO reviews (id, customer_id, business_id, rating, title, body, created_at, updated_at)
          VALUES (${reviewId}, ${dto.customerId}, ${businessId}, ${dto.rating}, ${dto.title ?? null}, ${dto.body}, ${now}, ${now})
          RETURNING id, rating, title, body, customer_id AS "customerId", business_id AS "businessId", created_at AS "createdAt", updated_at AS "updatedAt"
        `;

        // Recalculate average rating
        const [stats] = await tx.$queryRaw<
          { avg: number; cnt: number }[]
        >`
          SELECT
            COALESCE(AVG(rating)::numeric(3,2), 0) AS avg,
            COUNT(*)::int AS cnt
          FROM reviews
          WHERE business_id = ${businessId}
        `;

        await tx.$queryRaw`
          UPDATE businesses
          SET average_rating = ${stats.avg}, review_count = ${stats.cnt}, updated_at = ${now}
          WHERE id = ${businessId}
        `;

        this.logger.log(
          `Review created for business ${businessId}: new avg=${stats.avg}, count=${stats.cnt}`,
        );

        return review;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Customer has already reviewed this business',
        );
      }
      // Handle raw query unique violation (PostgreSQL error code 23505)
      if (
        error instanceof Error &&
        'code' in error &&
        (error as Record<string, unknown>).code === '23505'
      ) {
        throw new ConflictException(
          'Customer has already reviewed this business',
        );
      }
      throw error;
    }
  }

  async findByBusiness(
    businessId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<ReviewResponse>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { businessId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { businessId } }),
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

  async remove(id: string): Promise<void> {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) {
      throw new NotFoundException(`Review with id "${id}" not found`);
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Pessimistic lock on the business row
      await tx.$queryRaw`
        SELECT id FROM businesses WHERE id = ${review.businessId} FOR UPDATE
      `;

      await tx.$queryRaw`
        DELETE FROM reviews WHERE id = ${id}
      `;

      // Recalculate average rating
      const [stats] = await tx.$queryRaw<
        { avg: number; cnt: number }[]
      >`
        SELECT
          COALESCE(AVG(rating)::numeric(3,2), 0) AS avg,
          COUNT(*)::int AS cnt
        FROM reviews
        WHERE business_id = ${review.businessId}
      `;

      await tx.$queryRaw`
        UPDATE businesses
        SET average_rating = ${stats.avg}, review_count = ${stats.cnt}, updated_at = ${now}
        WHERE id = ${review.businessId}
      `;

      this.logger.log(
        `Review ${id} deleted from business ${review.businessId}: new avg=${stats.avg}, count=${stats.cnt}`,
      );
    });
  }
}
