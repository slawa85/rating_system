import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api/endpoints/products.api';

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id,
  });
};
