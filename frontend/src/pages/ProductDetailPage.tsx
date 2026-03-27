import { useParams } from 'react-router-dom';
import { Container } from '@/shared/components/layout/Container';
import { ProductDetail } from '@/features/products/components/ProductDetail';
import { Spinner } from '@/shared/components/ui/Spinner';
import { ErrorMessage } from '@/shared/components/ui/ErrorMessage';
import { useProduct } from '@/features/products/hooks/useProduct';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, error } = useProduct(id!);

  if (isLoading) {
    return (
      <Container className="py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container className="py-8">
        <ErrorMessage message={(error as Error)?.message || 'Product not found'} />
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <ProductDetail product={product} />

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
        <p className="text-gray-500">Reviews will be displayed here.</p>
      </div>
    </Container>
  );
}
