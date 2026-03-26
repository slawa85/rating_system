import { paginationSchema } from '../../common/dto/pagination.dto.js';

export const reviewQuerySchema = paginationSchema;

export type ReviewQueryDto = typeof reviewQuerySchema._output;
