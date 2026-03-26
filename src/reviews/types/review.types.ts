export interface ReviewResponse {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  customerId: string;
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
}
