import { api } from '../client';
import type { PaginatedResponse } from '../types/api.types';
import type { Review, CreateReviewDto, ReviewListParams } from '@/features/reviews/types/review.types';

export const reviewsApi = {
  getByProduct: (productId: string, params: ReviewListParams = {}) =>
    api.get<PaginatedResponse<Review>>(`/products/${productId}/reviews`, params),

  create: (productId: string, data: CreateReviewDto) =>
    api.post<Review>(`/products/${productId}/reviews`, data),

  delete: (reviewId: string) =>
    api.delete(`/reviews/${reviewId}`),
};
