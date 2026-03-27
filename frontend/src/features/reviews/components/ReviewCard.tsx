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

export function ReviewCard({
  review,
  showDelete,
  onDelete,
  isDeleting,
}: ReviewCardProps) {
  const getCustomerName = (customerId: string) => {
    const names = [
      'Sarah Johnson',
      'Mike Chen',
      'Emily Rodriguez',
      'David Smith',
      'Lisa Anderson',
      'James Wilson',
      'Maria Garcia',
      'Tom Brown',
      'Anna Lee',
      'Chris Taylor',
    ];
    const index = parseInt(customerId.slice(-1), 16) % names.length;
    return names[index] || 'Customer';
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-base">
              {getCustomerName(review.customerId)}
            </h3>
          </div>
          <p className="text-sm text-gray-500 mb-2">
            {formatRelativeDate(review.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RatingDisplay rating={review.rating} size="sm" />
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
      </div>

      {review.title && (
        <h4 className="font-medium text-base mb-2">{review.title}</h4>
      )}

      <p className="text-gray-700 leading-relaxed">{review.body}</p>
    </div>
  );
}
