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
  app.use(helmet());

  const cls = app.get(ClsService);
  app.useGlobalFilters(new GlobalExceptionFilter(cls));
  app.useGlobalInterceptors(new LoggingInterceptor(cls));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
