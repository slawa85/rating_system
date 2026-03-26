import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ClsModule } from 'nestjs-cls';
import { PrismaModule } from './prisma/prisma.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { BusinessesModule } from './businesses/businesses.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { TraceIdMiddleware } from './common/middleware/trace-id.middleware.js';
import { createLoggerConfig } from './config/logger.config.js';
import { validateEnv } from './config/app.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    LoggerModule.forRoot(createLoggerConfig()),
    PrismaModule,
    CustomersModule,
    BusinessesModule,
    ReviewsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceIdMiddleware).forRoutes('*');
  }
}
