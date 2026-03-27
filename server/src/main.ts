import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { ClsService } from 'nestjs-cls';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const isDevelopment = process.env.NODE_ENV !== 'production';

  app.enableCors({
    origin: isDevelopment
      ? (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          // In development, allow all localhost origins
          if (!origin || origin.startsWith('http://localhost:')) {
            callback(null, true);
          } else {
            callback(null, false);
          }
        }
      : frontendUrl,
    credentials: true,
  });

  const imgSrc = ["'self'", 'data:', 'https:'] as string[];
  if (isDevelopment) {
    // Vite (and other dev servers) use http://localhost:* — different origin than
    // the API, and not covered by https: or 'self'.
    imgSrc.push('http:');
    try {
      imgSrc.push(new URL(frontendUrl).origin);
    } catch {
      /* ignore invalid FRONTEND_URL */
    }
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc,
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const cls = app.get(ClsService);
  app.useGlobalFilters(new GlobalExceptionFilter(cls));
  app.useGlobalInterceptors(new LoggingInterceptor(cls));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

void bootstrap();
