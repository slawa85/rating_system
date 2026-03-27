import { useNavigate } from 'react-router-dom';
import { ProductImage } from './ProductImage';
import { RatingDisplay } from '@/features/reviews/components/RatingDisplay';
import type { Product } from '../types/product.types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/products/${product.id}`)}
      className="bg-white rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 hover:shadow-lg"
    >
      <ProductImage
        alt={product.name}
        className="w-full aspect-square object-cover"
      />

      <div className="p-4">
        {product.category && (
          <p className="text-xs text-gray-500 mb-2">{product.category}</p>
        )}

        <h3 className="font-semibold text-base mb-2 line-clamp-2">
          {product.name}
        </h3>

        <div className="flex items-center mb-2">
          <RatingDisplay
            rating={product.averageRating}
            showCount
            count={product.reviewCount}
            size="sm"
          />
        </div>

        {product.price && (
          <p className="text-blue-600 font-semibold text-lg">
            ${product.price.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}
