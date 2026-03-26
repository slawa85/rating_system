import {
  PipeTransform,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new HttpException(
        {
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: 'Validation failed',
          errors: this.formatErrors(result.error),
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return result.data;
  }

  private formatErrors(error: ZodError) {
    return error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
    }));
  }
}
