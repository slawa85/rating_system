import { api } from '../client';
import type { PaginatedResponse } from '../types/api.types';
import type {
  Review,
  CreateReviewDto,
  ReviewListParams,
  RatingDistribution,
} from '@/features/reviews/types/review.types';

export const reviewsApi = {
  getByProduct: (productId: string, params: ReviewListParams = {}) =>
    api.get<PaginatedResponse<Review>>(`/products/${productId}/reviews`, {
      ...(params.page != null && { page: String(params.page) }),
      ...(params.limit != null && { limit: String(params.limit) }),
    }),

  getRatingDistribution: (productId: string) =>
    api.get<{ ratingDistribution: RatingDistribution }>(
      `/products/${productId}/reviews/distribution`,
    ),

  create: (productId: string, data: CreateReviewDto) =>
    api.post<Review>(`/products/${productId}/reviews`, data),

  delete: (reviewId: string) =>
    api.delete(`/reviews/${reviewId}`),
};
