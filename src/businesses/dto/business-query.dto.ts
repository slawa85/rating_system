import { z } from 'zod';
import { paginationSchema } from '../../common/dto/pagination.dto.js';

export const businessQuerySchema = paginationSchema.extend({
  sortBy: z.enum(['averageRating', 'createdAt', 'name']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type BusinessQueryDto = z.infer<typeof businessQuerySchema>;
