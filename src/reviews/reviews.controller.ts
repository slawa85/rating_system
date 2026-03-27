import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service.js';
import { createReviewSchema } from './dto/create-review.dto.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';
import { reviewQuerySchema } from './dto/review-query.dto.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { PaginationQuery } from '../common/dto/pagination.dto.js';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('products/:productId/reviews')
  @Throttle({ short: { limit: 5, ttl: 1000 } })
  @Throttle({ medium: { limit: 30, ttl: 60000 } })
  @Throttle({ long: { limit: 100, ttl: 900000 } })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body(new ZodValidationPipe(createReviewSchema)) dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(productId, dto);
  }

  @Get('products/:productId/reviews')
  findByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query(new ZodValidationPipe(reviewQuerySchema)) query: PaginationQuery,
  ) {
    return this.reviewsService.findByProduct(productId, query);
  }

  @Get('customers/:customerId/reviews')
  findByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query(new ZodValidationPipe(reviewQuerySchema)) query: PaginationQuery,
  ) {
    return this.reviewsService.findByCustomer(customerId, query);
  }

  @Delete('reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.remove(id);
  }
}
