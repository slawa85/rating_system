import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { createCustomerSchema } from './dto/create-customer.dto.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';
import { customerQuerySchema } from './dto/customer-query.dto.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { PaginationQuery } from '../common/dto/pagination.dto.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createCustomerSchema))
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Get()
  findAll(
    @Query(new ZodValidationPipe(customerQuerySchema)) query: PaginationQuery,
  ) {
    return this.customersService.findAll(query);
  }
}
