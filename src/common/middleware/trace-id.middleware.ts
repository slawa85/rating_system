import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';

const TRACE_ID_HEADER = 'x-trace-id';
const TRACE_ID_PATTERN = /^[\w\-]{1,128}$/;

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const raw = req.headers[TRACE_ID_HEADER] as string | undefined;
    const traceId =
      raw && TRACE_ID_PATTERN.test(raw) ? raw : crypto.randomUUID();

    this.cls.set('traceId', traceId);
    res.setHeader('X-Trace-Id', traceId);

    next();
  }
}
