import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '@/api/endpoints/reviews.api';
import type { CreateReviewDto } from '../types/review.types';

export const useCreateReview = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReviewDto) =>
      reviewsApi.create(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', productId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
    },
  });
};
