import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { customerQuerySchema } from './dto/customer-query.dto.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { PaginationQuery } from '../common/dto/pagination.dto.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Get()
  findAll(
    @Query(new ZodValidationPipe(customerQuerySchema)) query: PaginationQuery,
  ) {
    return this.customersService.findAll(query);
  }
}
