import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
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
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createReviewSchema))
  create(
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(productId, dto);
  }

  @Get('products/:productId/reviews')
  findByProduct(
    @Param('productId') productId: string,
    @Query(new ZodValidationPipe(reviewQuerySchema)) query: PaginationQuery,
  ) {
    return this.reviewsService.findByProduct(productId, query);
  }

  @Get('customers/:customerId/reviews')
  findByCustomer(
    @Param('customerId') customerId: string,
    @Query(new ZodValidationPipe(reviewQuerySchema)) query: PaginationQuery,
  ) {
    return this.reviewsService.findByCustomer(customerId, query);
  }

  @Delete('reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
