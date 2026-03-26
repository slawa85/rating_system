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
import { BusinessesService } from './businesses.service.js';
import { createBusinessSchema } from './dto/create-business.dto.js';
import type { CreateBusinessDto } from './dto/create-business.dto.js';
import { businessQuerySchema } from './dto/business-query.dto.js';
import type { BusinessQueryDto } from './dto/business-query.dto.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createBusinessSchema))
  create(@Body() dto: CreateBusinessDto) {
    return this.businessesService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessesService.findOne(id);
  }

  @Get()
  findAll(
    @Query(new ZodValidationPipe(businessQuerySchema)) query: BusinessQueryDto,
  ) {
    return this.businessesService.findAll(query);
  }
}
