import { createParamDecorator } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';

export const TraceId = createParamDecorator((): string => {
  const cls = ClsServiceManager.getClsService();
  return cls.get('traceId') ?? 'unknown';
});
