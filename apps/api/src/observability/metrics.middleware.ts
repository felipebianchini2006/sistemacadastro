import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const diff = Number(end - start) / 1e9;
      const route = req.route?.path ?? req.path ?? 'unknown';
      this.metrics.observeRequest(req.method, route, res.statusCode, diff);
    });
    next();
  }
}
