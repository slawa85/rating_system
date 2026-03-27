import { useState } from 'react';
import { Container } from '@/shared/components/layout/Container';
import { ProductList } from '@/features/products/components/ProductList';
import { Pagination } from '@/shared/components/Pagination';
import { ErrorMessage } from '@/shared/components/ui/ErrorMessage';
import { useProducts } from '@/features/products/hooks/useProducts';

export default function HomePage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'averageRating' | 'createdAt' | 'name'>('averageRating');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, error } = useProducts({
    page,
    limit: 12,
    sortBy,
    order,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Container className="py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Products</h1>
          <p className="text-gray-600 mb-6">Browse our collection of top-rated products</p>
          
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="averageRating">Rating</option>
              <option value="createdAt">Date</option>
              <option value="name">Name</option>
            </select>

            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as typeof order)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="desc">High to Low</option>
              <option value="asc">Low to High</option>
            </select>
          </div>
        </div>

        {error && (
          <ErrorMessage message={error instanceof Error ? error.message : 'An error occurred'} className="mb-6" />
        )}

        <ProductList products={data?.data || []} isLoading={isLoading} />

        {data?.meta && (
          <Pagination
            currentPage={data.meta.page}
            totalPages={data.meta.totalPages}
            onPageChange={setPage}
          />
        )}
      </Container>
    </div>
  );
}
