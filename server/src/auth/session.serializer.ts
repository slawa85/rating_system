import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SessionUser } from './types/auth.types.js';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  serializeUser(
    user: SessionUser,
    done: (err: Error | null, id?: string) => void,
  ): void {
    done(null, user.id);
  }

  async deserializeUser(
    id: string,
    done: (err: Error | null, user?: SessionUser | false) => void,
  ): Promise<void> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
        select: { id: true, name: true, email: true },
      });
      if (!customer) {
        done(null, false);
        return;
      }
      done(null, customer);
    } catch (err) {
      done(err as Error);
    }
  }
}
