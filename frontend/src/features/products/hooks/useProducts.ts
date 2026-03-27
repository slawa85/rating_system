import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api/endpoints/products.api';
import type { ProductListParams } from '../types/product.types';

export const useProducts = (params: ProductListParams = {}) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.getAll(params),
  });
};
