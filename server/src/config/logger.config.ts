import { Params } from 'nestjs-pino';
import { ClsServiceManager } from 'nestjs-cls';

export function createLoggerConfig(): Params {
  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
      mixin() {
        const cls = ClsServiceManager.getClsService();
        return {
          traceId: cls?.get<string>('traceId') ?? 'unknown',
        };
      },
      serializers: {
        req(req: { method?: string; url?: string }) {
          return { method: req.method ?? '', url: req.url ?? '' };
        },
        res(res: { statusCode?: number }) {
          return { statusCode: res.statusCode ?? 0 };
        },
      },
    },
  };
}
