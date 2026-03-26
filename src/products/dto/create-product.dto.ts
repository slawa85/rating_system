import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().max(2048).optional(),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
