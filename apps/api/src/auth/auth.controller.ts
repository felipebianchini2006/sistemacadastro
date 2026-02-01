import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { z } from 'zod';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = loginSchema.parse(body);
    const { user, accessToken, refreshToken } = await this.authService.login(
      parsed.email,
      parsed.password,
    );

    this.setRefreshCookie(res, refreshToken);
    const csrfToken = this.setCsrfCookie(res);

    return { user, accessToken, csrfToken };
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') refreshToken?: string,
  ) {
    const token = refreshToken ?? req.cookies?.refresh_token;
    const {
      user,
      accessToken,
      refreshToken: newRefreshToken,
    } = this.authService.refresh(token);

    this.setRefreshCookie(res, newRefreshToken);
    const csrfToken = this.setCsrfCookie(res);

    return { user, accessToken, csrfToken };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isProduction(),
    });
    res.clearCookie(this.getCsrfCookieName(), {
      httpOnly: false,
      sameSite: 'lax',
      secure: this.isProduction(),
    });

    return { ok: true };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isProduction(),
    });
  }

  private setCsrfCookie(res: Response) {
    const token = randomBytes(32).toString('hex');
    res.cookie(this.getCsrfCookieName(), token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: this.isProduction(),
    });
    return token;
  }

  private getCsrfCookieName() {
    return (
      this.configService.get<string>('CSRF_COOKIE_NAME', { infer: true }) ??
      'csrf_token'
    );
  }

  private isProduction() {
    return this.configService.get('NODE_ENV') === 'production';
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
