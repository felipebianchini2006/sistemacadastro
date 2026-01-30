import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsMiddleware } from './metrics.middleware';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [MetricsService, MetricsMiddleware],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}
