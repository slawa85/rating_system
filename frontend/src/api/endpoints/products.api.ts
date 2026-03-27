import { api } from '../client';
import type { PaginatedResponse } from '../types/api.types';
import type { Product, ProductListParams } from '@/features/products/types/product.types';

function productListQuery(params: ProductListParams): Record<string, string> {
  const q: Record<string, string> = {};
  if (params.page != null) q.page = String(params.page);
  if (params.limit != null) q.limit = String(params.limit);
  if (params.sortBy != null) q.sortBy = params.sortBy;
  if (params.order != null) q.order = params.order;
  return q;
}

export const productsApi = {
  getAll: (params: ProductListParams = {}) =>
    api.get<PaginatedResponse<Product>>('/products', productListQuery(params)),

  getById: (id: string) =>
    api.get<Product>(`/products/${id}`),
};
