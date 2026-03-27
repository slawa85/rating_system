import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ClsModule } from 'nestjs-cls';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { ProductsModule } from './products/products.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { TraceIdMiddleware } from './common/middleware/trace-id.middleware.js';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { createLoggerConfig } from './config/logger.config.js';
import { validateEnv } from './config/app.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 100,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 1000,
      },
      {
        name: 'long',
        ttl: 900000,
        limit: 5000,
      },
    ]),
    LoggerModule.forRoot(createLoggerConfig()),
    PrismaModule,
    AuthModule,
    CustomersModule,
    ProductsModule,
    ReviewsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceIdMiddleware).forRoutes('*');
  }
}
