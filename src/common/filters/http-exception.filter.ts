import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ClsService } from 'nestjs-cls';
import { StandardErrorResponse } from '../types/error-response.types.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly cls: ClsService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const traceId = this.cls.get('traceId') ?? 'unknown';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const body: StandardErrorResponse = {
        statusCode: status,
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as Record<string, unknown>).message as string,
        error: (exceptionResponse as Record<string, unknown>)
          .error as string | undefined,
        errors: (exceptionResponse as Record<string, unknown>).errors as
          | StandardErrorResponse['errors']
          | undefined,
        traceId,
      };

      if (status >= 500) {
        this.logger.error({ ...body, stack: exception.stack }, exception.message);
      } else if (status >= 400) {
        this.logger.warn(body, exception.message);
      }

      res.status(status).json(body);
      return;
    }

    this.logger.error(
      { traceId, stack: (exception as Error)?.stack },
      (exception as Error)?.message ?? 'Unexpected error',
    );

    const body: StandardErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      traceId,
    };

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
