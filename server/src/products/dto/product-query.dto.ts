import { z } from 'zod';
import { paginationSchema } from '../../common/dto/pagination.dto.js';

export const productQuerySchema = paginationSchema.extend({
  sortBy: z.enum(['averageRating', 'createdAt', 'name']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ProductQueryDto = z.infer<typeof productQuerySchema>;
