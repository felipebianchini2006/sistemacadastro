import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './auth.types';
import { RoleName } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtl: string;
  private readonly refreshTtl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET', { infer: true }) ??
      '';
    this.refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET', { infer: true }) ??
      '';
    this.accessTtl =
      this.configService.get<string>('JWT_ACCESS_TTL', { infer: true }) ??
      '15m';
    this.refreshTtl =
      this.configService.get<string>('JWT_REFRESH_TTL', { infer: true }) ??
      '7d';
  }

  async validateAdmin(
    email: string,
    password: string,
  ): Promise<AuthUser | null> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (!admin) {
      return null;
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return null;
    }

    const roles = admin.roles.map((entry) => entry.role.name);

    return {
      id: admin.id,
      email: admin.email,
      roles,
    };
  }

  async login(email: string, password: string) {
    const user = await this.validateAdmin(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.issueTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    try {
      const payload = this.jwtService.verify<AuthUser>(refreshToken, {
        secret: this.refreshSecret,
      });

      const user: AuthUser = {
        id: payload.id,
        email: payload.email,
        roles: payload.roles ?? [],
      };

      const tokens = this.issueTokens(user);

      return {
        user,
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  issueTokens(user: AuthUser) {
    const payload = {
      id: user.id,
      email: user.email,
      roles: user.roles as RoleName[],
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessTtl as JwtSignOptions['expiresIn'],
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshTtl as JwtSignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }
}
