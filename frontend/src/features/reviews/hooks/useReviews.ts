import { useQuery } from '@tanstack/react-query';
import { reviewsApi } from '@/api/endpoints/reviews.api';
import type { ReviewListParams } from '../types/review.types';

export const useReviews = (productId: string, params: ReviewListParams = {}) => {
  return useQuery({
    queryKey: ['reviews', productId, params],
    queryFn: () => reviewsApi.getByProduct(productId, params),
    enabled: !!productId,
  });
};
