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

  @Post('businesses/:businessId/reviews')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createReviewSchema))
  create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(businessId, dto);
  }

  @Get('businesses/:businessId/reviews')
  findByBusiness(
    @Param('businessId') businessId: string,
    @Query(new ZodValidationPipe(reviewQuerySchema)) query: PaginationQuery,
  ) {
    return this.reviewsService.findByBusiness(businessId, query);
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
