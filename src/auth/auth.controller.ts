import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { registerSchema } from './dto/register.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { loginSchema } from './dto/login.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({
    short: { limit: 3, ttl: 1000 },
    medium: { limit: 20, ttl: 60000 },
    long: { limit: 50, ttl: 900000 },
  })
  @HttpCode(HttpStatus.CREATED)
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @Throttle({
    short: { limit: 5, ttl: 1000 },
    medium: { limit: 30, ttl: 60000 },
    long: { limit: 100, ttl: 900000 },
  })
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }
}
