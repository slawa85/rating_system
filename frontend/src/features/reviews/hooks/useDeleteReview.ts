import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '@/api/endpoints/reviews.api';

export const useDeleteReview = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => reviewsApi.delete(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', productId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['reviewEligibility', productId] });
      queryClient.invalidateQueries({
        queryKey: ['ratingDistribution', productId],
      });
    },
  });
};
