import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';

export const TraceId = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): string => {
    const cls = ClsServiceManager.getClsService();
    return cls.get('traceId') ?? 'unknown';
  },
);
