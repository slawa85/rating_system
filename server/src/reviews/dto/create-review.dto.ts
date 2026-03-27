import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z
    .string()
    .max(255)
    .optional()
    .transform((t) => (t ? sanitizeHtml(t) : t)),
  body: z
    .string()
    .min(1)
    .max(5000)
    .transform((b) => sanitizeHtml(b)),
});

export type CreateReviewDto = z.infer<typeof createReviewSchema>;
