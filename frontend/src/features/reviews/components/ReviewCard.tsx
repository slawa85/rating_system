import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { RatingDisplay } from './RatingDisplay';
import { formatRelativeDate } from '@/shared/utils/format';
import type { Review } from '../types/review.types';

interface ReviewCardProps {
  review: Review;
  showDelete?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function ReviewCard({ review, showDelete, onDelete, isDeleting }: ReviewCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <RatingDisplay rating={review.rating} size="sm" />
          {review.title && (
            <h3 className="font-semibold text-lg mt-2">{review.title}</h3>
          )}
        </div>
        {showDelete && onDelete && (
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            isLoading={isDeleting}
          >
            Delete
          </Button>
        )}
      </div>

      <p className="text-gray-700 whitespace-pre-wrap">{review.body}</p>

      <div className="mt-4 text-sm text-gray-500">
        {formatRelativeDate(review.createdAt)}
      </div>
    </Card>
  );
}
