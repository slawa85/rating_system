export interface ReviewResponse {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  customerId: string;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
  customerName: string;
}
