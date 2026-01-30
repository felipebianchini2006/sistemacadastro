import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

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

  async enqueueOcr(payload: {
    proposalId: string;
    documentFileId: string;
    requestId?: string;
  }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.queue.add(
      'ocr.process',
      {
        proposalId: payload.proposalId,
        documentFileId: payload.documentFileId,
        requestId,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
      },
    );
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
