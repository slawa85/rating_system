export interface BusinessResponse {
  id: string;
  name: string;
  description: string | null;
  averageRating: unknown;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}
