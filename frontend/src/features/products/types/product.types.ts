export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  sortBy?: 'averageRating' | 'createdAt' | 'name';
  order?: 'asc' | 'desc';
}

export interface CreateProductDto {
  sku: string;
  name: string;
  description?: string;
  imageUrl?: string;
}
