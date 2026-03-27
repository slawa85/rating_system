import { z } from 'zod';
import {
  sanitizeText,
  sanitizeRichText,
} from '../../common/utils/sanitize.js';

export const createProductSchema = z.object({
  sku: z
    .string()
    .min(1)
    .max(100)
    .transform((s) => sanitizeText(s)),
  name: z
    .string()
    .min(1)
    .max(255)
    .transform((n) => sanitizeText(n)),
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((d) => (d ? sanitizeRichText(d) : d)),
  imageUrl: z.string().url().max(2048).optional(),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
