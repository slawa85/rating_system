import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { createProductSchema } from './dto/create-product.dto.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import { productQuerySchema } from './dto/product-query.dto.js';
import type { ProductQueryDto } from './dto/product-query.dto.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductDto,
  ) {
    return this.productsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Get()
  findAll(
    @Query(new ZodValidationPipe(productQuerySchema)) query: ProductQueryDto,
  ) {
    return this.productsService.findAll(query);
  }
}
