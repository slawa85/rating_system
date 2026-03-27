import { z } from 'zod';
import {
  sanitizeText,
  sanitizeRichText,
} from '../../common/utils/sanitize.js';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z
    .string()
    .max(255)
    .optional()
    .transform((t) => (t ? sanitizeText(t) : t)),
  body: z
    .string()
    .min(1)
    .max(5000)
    .transform((b) => sanitizeRichText(b)),
});

export type CreateReviewDto = z.infer<typeof createReviewSchema>;
