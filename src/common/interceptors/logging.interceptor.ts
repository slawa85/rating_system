import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const traceId = this.cls.get<string>('traceId') ?? 'unknown';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<Response>();
          this.logger.log({
            traceId,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
          });
        },
        error: (error: unknown) => {
          const statusCode =
            error instanceof HttpException ? error.getStatus() : 500;
          this.logger.warn({
            traceId,
            method: req.method,
            url: req.originalUrl,
            statusCode,
            durationMs: Date.now() - start,
          });
        },
      }),
    );
  }
}
