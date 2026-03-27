import type { Prisma } from '../../../generated/prisma/client/client.js';

export interface ProductResponse {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  averageRating: Prisma.Decimal;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}
