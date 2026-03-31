import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type {
  AuthResponse,
  JwtPayload,
  SessionUser,
} from './types/auth.types.js';
import { Prisma } from '../../generated/prisma/client/client.js';

const BCRYPT_SALT_ROUNDS = 12;
const DUMMY_HASH =
  '$2b$12$LJ3m4ys3Lg2VbEID/fPBNOKxNQuFKnV9dIxMHrMRjEqokIjEJdFdK';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    try {
      const customer = await this.prisma.customer.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
        },
      });

      const token = this.generateToken(customer.id, customer.email);

      return {
        accessToken: token,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Registration could not be completed. If this email is already registered, please log in instead.',
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    const passwordValid = await bcrypt.compare(
      dto.password,
      customer?.passwordHash ?? DUMMY_HASH,
    );

    if (!customer || !passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.generateToken(customer.id, customer.email);

    return {
      accessToken: token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
    };
  }
  async loginSession(dto: LoginDto): Promise<SessionUser> {
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (!customer) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      customer?.passwordHash ?? DUMMY_HASH,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
    };
  }

  async validateUser(email: string, password: string): Promise<SessionUser> {
    const customer = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(
      password,
      customer?.passwordHash ?? DUMMY_HASH,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
    };
  }

  private generateToken(customerId: string, email: string): string {
    const payload: JwtPayload = { sub: customerId, email };
    return this.jwtService.sign(payload);
  }
}
