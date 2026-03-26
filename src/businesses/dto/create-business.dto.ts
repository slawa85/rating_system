import { z } from 'zod';

export const createBusinessSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});

export type CreateBusinessDto = z.infer<typeof createBusinessSchema>;
