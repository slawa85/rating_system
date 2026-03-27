import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductQueryDto } from './dto/product-query.dto.js';
import { PaginatedResponse } from '../common/types/pagination.types.js';
import { ProductResponse } from './types/product.types.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string): Promise<ProductResponse> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    return product;
  }

  async findAll(
    query: ProductQueryDto,
  ): Promise<PaginatedResponse<ProductResponse>> {
    const { page, limit, sortBy, order } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
      }),
      this.prisma.product.count(),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
