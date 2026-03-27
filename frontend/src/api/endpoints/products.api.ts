import { api } from '../client';
import type { PaginatedResponse } from '../types/api.types';
import type { Product, ProductListParams, CreateProductDto } from '@/features/products/types/product.types';

export const productsApi = {
  getAll: (params: ProductListParams = {}) =>
    api.get<PaginatedResponse<Product>>('/products', params),

  getById: (id: string) =>
    api.get<Product>(`/products/${id}`),

  create: (data: CreateProductDto) =>
    api.post<Product>('/products', data),
};
