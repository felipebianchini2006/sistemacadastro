import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JobsService implements OnModuleDestroy {
  private readonly queue: Queue;
  private readonly connection: IORedis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl =
      this.configService.get<string>('REDIS_URL', { infer: true }) ??
      'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue('public-jobs', { connection: this.connection });
  }

  async enqueueOcr(payload: { proposalId: string; documentIds: string[] }) {
    await this.queue.add('ocr.process', payload, {
      removeOnComplete: true,
      attempts: 3,
    });
  }

  async enqueueReceivedNotification(payload: {
    proposalId: string;
    protocol: string;
  }) {
    await this.queue.add('notify.received', payload, {
      removeOnComplete: true,
      attempts: 3,
    });
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.connection.quit();
  }
}
