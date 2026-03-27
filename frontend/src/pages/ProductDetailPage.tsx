import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container } from '@/shared/components/layout/Container';
import { ProductDetail } from '@/features/products/components/ProductDetail';
import { ReviewList } from '@/features/reviews/components/ReviewList';
import { ReviewForm } from '@/features/reviews/components/ReviewForm';
import { RatingBreakdown } from '@/features/reviews/components/RatingBreakdown';
import { Spinner } from '@/shared/components/ui/Spinner';
import { ErrorMessage } from '@/shared/components/ui/ErrorMessage';
import { useProduct } from '@/features/products/hooks/useProduct';
import { useReviews } from '@/features/reviews/hooks/useReviews';
import { useDeleteReview } from '@/features/reviews/hooks/useDeleteReview';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRatingDistribution } from '@/features/reviews/hooks/useRatingDistribution';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [reviewPage, setReviewPage] = useState(1);
  const { user } = useAuth();

  const {
    data: product,
    isLoading: productLoading,
    error: productError,
  } = useProduct(id || '');
  const { data: reviewsData, isLoading: reviewsLoading } = useReviews(id || '', {
    page: reviewPage,
    limit: 10,
  });
  const {
    mutate: deleteReview,
    isPending: isDeleting,
    variables: deletingReviewId,
  } = useDeleteReview(id || '');

  const { data: distributionRes, isLoading: distributionLoading } =
    useRatingDistribution(id || '', Boolean(product && product.reviewCount > 0));

  if (!id) {
    return (
      <Container className="py-8">
        <ErrorMessage message="Product ID is missing" />
      </Container>
    );
  }

  if (productLoading) {
    return (
      <Container className="py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </Container>
    );
  }

  if (productError || !product) {
    return (
      <Container className="py-8">
        <ErrorMessage
          message={
            productError instanceof Error
              ? productError.message
              : 'Product not found'
          }
        />
      </Container>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Container className="py-8">
        <ProductDetail product={product} />

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

          {product.reviewCount > 0 && (
            <RatingBreakdown
              averageRating={product.averageRating}
              reviewCount={product.reviewCount}
              ratingDistribution={distributionRes?.ratingDistribution}
              isDistributionLoading={distributionLoading}
            />
          )}

          {user ? (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Write a Review</h3>
              <ReviewForm productId={id} />
            </div>
          ) : (
            <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Please{' '}
                <a href="/login" className="font-medium underline">
                  login
                </a>{' '}
                to write a review.
              </p>
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-xl font-semibold">All Reviews</h3>
          </div>

          <ReviewList
            reviews={reviewsData?.data || []}
            isLoading={reviewsLoading}
            currentPage={reviewsData?.meta.page || 1}
            totalPages={reviewsData?.meta.totalPages || 1}
            onPageChange={setReviewPage}
            currentUserId={user?.id}
            onDeleteReview={deleteReview}
            deletingReviewId={isDeleting ? (deletingReviewId as string) : null}
          />
        </div>
      </Container>
    </div>
  );
}
