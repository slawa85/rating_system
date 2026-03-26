import { Decimal } from '@prisma/client/runtime/library';

export interface BusinessResponse {
  id: string;
  name: string;
  description: string | null;
  averageRating: Decimal;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}
