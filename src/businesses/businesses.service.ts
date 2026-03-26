import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';
import { BusinessQueryDto } from './dto/business-query.dto.js';
import { PaginatedResponse } from '../common/types/pagination.types.js';
import { BusinessResponse } from './types/business.types.js';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBusinessDto): Promise<BusinessResponse> {
    return this.prisma.business.create({ data: dto });
  }

  async findOne(id: string): Promise<BusinessResponse> {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) {
      throw new NotFoundException(`Business with id "${id}" not found`);
    }
    return business;
  }

  async findAll(
    query: BusinessQueryDto,
  ): Promise<PaginatedResponse<BusinessResponse>> {
    const { page, limit, sortBy, order } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.business.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
      }),
      this.prisma.business.count(),
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
