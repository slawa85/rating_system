import { useQuery } from '@tanstack/react-query';
import { reviewsApi } from '@/api/endpoints/reviews.api';

export function useRatingDistribution(
  productId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['ratingDistribution', productId],
    queryFn: () => reviewsApi.getRatingDistribution(productId),
    enabled: Boolean(productId && enabled),
  });
}
