import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';
import type { JwtPayload } from '../../auth/types/auth.types.js';

/**
 * Custom throttler that applies different rate limits based on authentication status:
 * - Authenticated users: tracked by user ID (each user gets their own quota)
 * - Unauthenticated users: tracked by IP + User-Agent (shared quota per IP/browser)
 *
 * This allows authenticated users to have more generous limits since they have accountability.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    const user = (req as Request & { user?: JwtPayload }).user;

    if (user?.sub) {
      return Promise.resolve(`user:${user.sub}`);
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return Promise.resolve(`ip:${ip}-${userAgent}`);
  }

  protected throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new ThrottlerException(
      'Too many requests. Please slow down and try again later.',
    );
  }
}
