import { Strategy, type IStrategyOptions } from 'passport-local';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service.js';
import { PassportStrategy } from '@nestjs/passport';
import type { SessionUser } from '../types/auth.types.js';

const LOCAL_STRATEGY_OPTIONS: IStrategyOptions = {
  usernameField: 'email',
  passwordField: 'password',
};

/**
 * Passport `local` strategy — runs only when a route uses `AuthGuard('local')`
 * (see `POST /auth/login`). It is not invoked for other routes or for `SessionAuthGuard`
 * (`isAuthenticated` + session deserialize only).
 */
@Injectable()
export class SessionStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super(LOCAL_STRATEGY_OPTIONS);
  }

  async validate(email: string, password: string): Promise<SessionUser> {
    const customer = await this.authService.validateUser(email, password);
    return customer;
  }
}
