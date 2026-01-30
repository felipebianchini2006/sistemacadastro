import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const createCsrfMiddleware = (configService: ConfigService) => {
  const enabled =
    configService.get<boolean>('CSRF_ENABLED', { infer: true }) ?? true;
  const cookieName =
    configService.get<string>('CSRF_COOKIE_NAME', { infer: true }) ??
    'csrf_token';
  const headerName =
    configService.get<string>('CSRF_HEADER_NAME', { infer: true }) ??
    'x-csrf-token';

  return (req: Request, res: Response, next: NextFunction) => {
    if (!enabled) return next();
    if (SAFE_METHODS.has(req.method)) return next();
    if (!req.originalUrl.startsWith('/admin')) return next();

    const token = req.cookies?.[cookieName];
    const header = req.headers[headerName] as string | undefined;

    if (!token || !header || token !== header) {
      res.status(403).json({ message: 'CSRF token invalid' });
      return;
    }

    next();
  };
};
