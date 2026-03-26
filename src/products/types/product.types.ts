export interface ProductResponse {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  averageRating: unknown;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}
