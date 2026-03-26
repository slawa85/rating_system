import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';
import { v4 as uuidv4 } from 'uuid';

const TRACE_ID_HEADER = 'x-trace-id';

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const traceId =
      (req.headers[TRACE_ID_HEADER] as string | undefined) || uuidv4();

    this.cls.set('traceId', traceId);
    res.setHeader('X-Trace-Id', traceId);

    next();
  }
}
