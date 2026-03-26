import { paginationSchema } from '../../common/dto/pagination.dto.js';

export const customerQuerySchema = paginationSchema;

export type CustomerQueryDto = typeof customerQuerySchema._output;
