import { useNavigate } from 'react-router-dom';
import { ProductImage } from './ProductImage';
import type { Product } from '../types/product.types';

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const navigate = useNavigate();

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to products
      </button>

      <div className="bg-white rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/2">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              className="w-full aspect-square rounded-lg object-cover"
            />
          </div>

          <div className="md:w-1/2">
            {product.category && (
              <p className="text-sm text-gray-500 mb-2">{product.category}</p>
            )}

            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>

            {product.price && (
              <p className="text-2xl text-blue-600 font-semibold mb-4">
                ${product.price.toFixed(2)}
              </p>
            )}

            {product.description && (
              <p className="text-gray-700 mb-6">{product.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
