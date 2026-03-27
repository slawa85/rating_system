import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

export const createProductSchema = z.object({
  sku: z
    .string()
    .min(1)
    .max(100)
    .transform((s) => sanitizeHtml(s)),
  name: z
    .string()
    .min(1)
    .max(255)
    .transform((n) => sanitizeHtml(n)),
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((d) => (d ? sanitizeHtml(d) : d)),
  imageUrl: z.string().url().max(2048).optional(),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
