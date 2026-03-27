import { ProductImage } from './ProductImage';
import { RatingDisplay } from '@/features/reviews/components/RatingDisplay';
import type { Product } from '../types/product.types';

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/2">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-96 rounded-lg"
          />
        </div>

        <div className="md:w-1/2">
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          
          <div className="mb-4">
            <RatingDisplay
              rating={product.averageRating}
              showCount
              count={product.reviewCount}
              size="lg"
            />
          </div>

          {product.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-gray-700">{product.description}</p>
            </div>
          )}

          <div className="text-sm text-gray-500">
            <p>SKU: {product.sku}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
