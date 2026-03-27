import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  body: z.string().min(1).max(5000),
});

export type CreateReviewDto = z.infer<typeof createReviewSchema>;
