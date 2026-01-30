import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PublicService } from './public.service';

@Injectable()
export class PublicCleanupService {
  constructor(private readonly publicService: PublicService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanup() {
    await this.publicService.cleanupExpiredDrafts();
  }
}
