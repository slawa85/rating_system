import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionStrategy } from './strategies/session.strategy.js';
import { SessionSerializer } from './session.serializer.js';
import { CustomersModule } from '../customers/customers.module.js';

@Module({
  imports: [
    PassportModule.register({ session: true }),
    CustomersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRATION') ??
            '1h') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionStrategy, SessionSerializer],
})
export class AuthModule {}
