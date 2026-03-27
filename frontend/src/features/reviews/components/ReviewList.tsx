import { ReviewCard } from './ReviewCard';
import { ReviewSkeleton } from './ReviewSkeleton';
import { Pagination } from '@/shared/components/Pagination';
import type { Review } from '../types/review.types';

interface ReviewListProps {
  reviews: Review[];
  isLoading?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  currentUserId?: string | null;
  onDeleteReview?: (reviewId: string) => void;
  deletingReviewId?: string | null;
}

export function ReviewList({
  reviews,
  isLoading,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  currentUserId,
  onDeleteReview,
  deletingReviewId,
}: ReviewListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <ReviewSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-lg">No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4 mb-6">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            showDelete={currentUserId === review.customerId}
            onDelete={() => onDeleteReview?.(review.id)}
            isDeleting={deletingReviewId === review.id}
          />
        ))}
      </div>

      {totalPages > 1 && onPageChange && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
