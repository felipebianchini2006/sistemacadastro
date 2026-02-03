import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

type QueueStats = {
  name: string;
  label: string;
  counts: Record<string, number>;
  isPaused: boolean;
};

@Injectable()
export class AdminQueuesService implements OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queues: Array<{ name: string; label: string; queue: Queue }>;

  constructor(private readonly configService: ConfigService) {
    const redisUrl =
      this.configService.get<string>('REDIS_URL', { infer: true }) ??
      'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    this.queues = [
      {
        name: 'public-jobs',
        label: 'Public',
        queue: new Queue('public-jobs', { connection: this.connection }),
      },
      {
        name: 'signature-jobs',
        label: 'Assinatura',
        queue: new Queue('signature-jobs', { connection: this.connection }),
      },
      {
        name: 'notification-jobs',
        label: 'Notificacoes',
        queue: new Queue('notification-jobs', { connection: this.connection }),
      },
      {
        name: 'maintenance-jobs',
        label: 'Manutencao',
        queue: new Queue('maintenance-jobs', { connection: this.connection }),
      },
      {
        name: 'totvs-jobs',
        label: 'Totvs',
        queue: new Queue('totvs-jobs', { connection: this.connection }),
      },
    ];
  }

  async getOverview() {
    const stats: QueueStats[] = [];

    for (const entry of this.queues) {
      const counts = await entry.queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'paused',
      );
      const isPaused = await entry.queue.isPaused();
      stats.push({
        name: entry.name,
        label: entry.label,
        counts,
        isPaused,
      });
    }

    return { queues: stats };
  }

  async onModuleDestroy() {
    await Promise.all(this.queues.map((entry) => entry.queue.close()));
    await this.connection.quit();
  }
}
