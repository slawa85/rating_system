export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  customerId: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewDto {
  rating: number;
  title?: string;
  body: string;
}

export interface ReviewListParams {
  page?: number;
  limit?: number;
}

export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}
