import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async metricsEndpoint(@Res() res: Response) {
    const enabled = this.configService.get<boolean>('METRICS_ENABLED', {
      infer: true,
    });
    if (!enabled) {
      return res.status(404).send('Not Found');
    }

    const contentType = this.metrics.getContentType();
    const data = await this.metrics.getMetrics();
    res.setHeader('Content-Type', contentType);
    return res.send(data);
  }
}
