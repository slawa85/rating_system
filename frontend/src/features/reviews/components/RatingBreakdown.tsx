import type { RatingDistribution } from '../types/review.types';

interface RatingBreakdownProps {
  averageRating: number;
  reviewCount: number;
  ratingDistribution?: RatingDistribution;
  /** When true and `ratingDistribution` is still undefined, show bar skeletons. */
  isDistributionLoading?: boolean;
}

export function RatingBreakdown({
  averageRating,
  reviewCount,
  ratingDistribution,
  isDistributionLoading = false,
}: RatingBreakdownProps) {
  // Ensure averageRating is a valid number
  const numericRating =
    typeof averageRating === 'number'
      ? averageRating
      : parseFloat(String(averageRating)) || 0;

  const showDistributionSkeleton =
    isDistributionLoading && ratingDistribution === undefined;

  const distribution: RatingDistribution =
    ratingDistribution ?? {
      5: Math.floor(reviewCount * 0.5),
      4: Math.floor(reviewCount * 0.2),
      3: Math.floor(reviewCount * 0.15),
      2: Math.floor(reviewCount * 0.1),
      1: Math.floor(reviewCount * 0.05),
    };

  const getPercentage = (count: number) => {
    if (reviewCount === 0) return 0;
    return Math.round((count / reviewCount) * 100);
  };

  return (
    <div className="bg-white rounded-lg p-6 mb-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex flex-col items-center justify-center md:w-1/3 md:border-r border-gray-200 md:pr-8">
          <div className="text-5xl font-bold mb-2">
            {numericRating.toFixed(1)}
          </div>
          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-6 h-6 ${i < Math.floor(numericRating) ? 'fill-yellow-400' : 'fill-gray-300'}`}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Based on {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        <div className="flex-1">
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((stars) => {
              if (showDistributionSkeleton) {
                return (
                  <div key={stars} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-12">
                      <span className="text-sm font-medium text-gray-400">
                        {stars}
                      </span>
                      <div className="w-4 h-4 rounded bg-gray-200 animate-pulse" />
                    </div>
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full w-2/5 bg-gray-300 animate-pulse rounded-full" />
                    </div>
                    <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                );
              }

              const count = distribution[stars as keyof typeof distribution];
              const percentage = getPercentage(count);

              return (
                <div key={stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm font-medium">{stars}</span>
                    <svg
                      className="w-4 h-4 fill-yellow-400"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>

                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="text-sm text-gray-600 w-12 text-right">
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
