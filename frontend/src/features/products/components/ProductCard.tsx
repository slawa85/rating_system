import { useNavigate } from 'react-router-dom';
import { Card } from '@/shared/components/ui/Card';
import { ProductImage } from './ProductImage';
import { RatingDisplay } from '@/features/reviews/components/RatingDisplay';
import type { Product } from '../types/product.types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      hoverable
      onClick={() => navigate(`/products/${product.id}`)}
      className="h-full flex flex-col"
    >
      <ProductImage
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-48 rounded-md mb-4"
      />
      
      <h3 className="font-semibold text-lg mb-2 line-clamp-2">
        {product.name}
      </h3>
      
      {product.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {product.description}
        </p>
      )}
      
      <div className="mt-auto">
        <RatingDisplay
          rating={product.averageRating}
          showCount
          count={product.reviewCount}
          size="sm"
        />
      </div>
    </Card>
  );
}
