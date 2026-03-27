import { useId, type ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface RatingDisplayProps {
  rating: number;
  showCount?: boolean;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const starSizeClass = {
  sm: 'w-4 h-4 flex-shrink-0',
  md: 'w-5 h-5 flex-shrink-0',
  lg: 'w-6 h-6 flex-shrink-0',
} as const;

export function RatingDisplay({
  rating,
  showCount,
  count,
  size = 'md',
  className,
}: RatingDisplayProps) {
  const gradientId = useId();

  const numericRating =
    typeof rating === 'number' ? rating : parseFloat(String(rating)) || 0;

  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  const svgBase = starSizeClass[size];

  const renderStars = () => {
    const stars: ReactNode[] = [];
    const fullStars = Math.floor(numericRating);
    const hasHalfStar = numericRating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <svg
            key={i}
            className={cn(svgBase, 'fill-yellow-400')}
            viewBox="0 0 20 20"
            aria-hidden
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>,
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <svg
            key={i}
            className={cn(svgBase, 'text-yellow-400')}
            viewBox="0 0 20 20"
            aria-hidden
          >
            <defs>
              <linearGradient id={gradientId}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#d1d5db" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#${gradientId})`}
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>,
        );
      } else {
        stars.push(
          <svg
            key={i}
            className={cn(svgBase, 'fill-gray-300')}
            viewBox="0 0 20 20"
            aria-hidden
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>,
        );
      }
    }
    return stars;
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className={cn('font-semibold text-gray-700', sizes[size])}>
        {numericRating.toFixed(1)}
      </span>
      <div className="flex gap-0.5 items-center">{renderStars()}</div>
      {showCount && count !== undefined && (
        <span className={cn('text-gray-600 ml-1', sizes[size])}>
          ({count} {count === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
}
