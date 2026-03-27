import { useState } from 'react';
import type { FormEvent } from 'react';
import { RatingInput } from './RatingInput';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { ErrorMessage } from '@/shared/components/ui/ErrorMessage';
import { useCreateReview } from '../hooks/useCreateReview';

interface ReviewFormProps {
  productId: string;
}

export function ReviewForm({ productId }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { mutate: createReview, isPending, error, isSuccess } = useCreateReview(productId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      return;
    }

    createReview(
      { rating, title: title || undefined, body },
      {
        onSuccess: () => {
          setRating(0);
          setTitle('');
          setBody('');
        },
      }
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-semibold mb-4">Write a Review</h3>

      {isSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
          <p className="text-sm">Review submitted successfully!</p>
        </div>
      )}

      {error && (
        <ErrorMessage 
          message={error instanceof Error ? error.message : 'An error occurred'} 
          className="mb-4" 
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <RatingInput
          value={rating}
          onChange={setRating}
          disabled={isPending}
        />

        <Input
          label="Title (optional)"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum up your review"
          disabled={isPending}
          maxLength={100}
        />

        <div>
          <label htmlFor="review-body" className="block text-sm font-medium text-gray-700 mb-1">
            Review
          </label>
          <textarea
            id="review-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts about this product"
            required
            disabled={isPending}
            minLength={10}
            maxLength={5000}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            {body.length}/5000 characters (minimum 10)
          </p>
        </div>

        <Button
          type="submit"
          isLoading={isPending}
          disabled={rating === 0 || body.length < 10}
        >
          Submit Review
        </Button>
      </form>
    </div>
  );
}
