import { Worker, Job, UnrecoverableError } from 'bullmq';
import IORedis from 'ioredis';
import { NotificationStatus } from '@prisma/client';

import { prisma } from '../prisma';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { WhatsappService } from './whatsapp.service';
import { NotificationJobPayload } from './notification.types';

export class NotificationWorker {
  private readonly connection: IORedis;
  private readonly worker: Worker<NotificationJobPayload>;
  private readonly email: EmailService;
  private readonly sms: SmsService;
  private readonly whatsapp: WhatsappService;

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    const concurrency = parseNumber(process.env.NOTIFICATION_CONCURRENCY, 3);

    this.email = new EmailService();
    this.sms = new SmsService();
    this.whatsapp = new WhatsappService();

    this.worker = new Worker<NotificationJobPayload>(
      'notification-jobs',
      (job) => this.handleJob(job),
      {
        connection: this.connection,
        concurrency,
      },
    );

    this.worker.on('failed', (job, err) => {
      console.error(
        { jobId: job?.id, jobName: job?.name, err: err.message },
        'notification.failed',
      );
    });
  }

  async shutdown() {
    await this.worker.close();
    await this.connection.quit();
    await prisma.$disconnect();
  }

  private async handleJob(job: Job<NotificationJobPayload>) {
    if (job.name === 'notify.email') {
      return this.processEmail(job);
    }

    if (job.name === 'notify.sms') {
      return this.processSms(job);
    }

    if (job.name === 'notify.whatsapp') {
      return this.processWhatsapp(job);
    }

    return undefined;
  }

  private async processEmail(job: Job<NotificationJobPayload>) {
    return this.processNotification(job, async () => {
      return this.email.send({
        to: job.data.to,
        template: job.data.template,
        data: job.data.data,
      });
    });
  }

  private async processSms(job: Job<NotificationJobPayload>) {
    return this.processNotification(job, async () => {
      return this.sms.send({
        to: job.data.to,
        template: job.data.template,
        data: job.data.data,
      });
    });
  }

  private async processWhatsapp(job: Job<NotificationJobPayload>) {
    return this.processNotification(job, async () => {
      return this.whatsapp.send({
        to: job.data.to,
        template: job.data.template,
        data: job.data.data,
        optIn: job.data.optIn,
      });
    });
  }

  private async processNotification(
    job: Job<NotificationJobPayload>,
    sender: () => Promise<string | undefined>,
  ) {
    try {
      const providerId = await sender();

      await prisma.notification.update({
        where: { id: job.data.notificationId },
        data: {
          status: NotificationStatus.SENT,
          providerMessageId: providerId,
        },
      });
    } catch (error) {
      const err = error as any;
      const permanent = isPermanentError(err);

      if (permanent) {
        await prisma.notification.update({
          where: { id: job.data.notificationId },
          data: {
            status: NotificationStatus.FAILED,
          },
        });
      }

      if (permanent) {
        throw new UnrecoverableError(err?.message ?? 'Permanent error');
      }

      throw err;
    }
  }
}

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = value ? Number(value) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
};

const isPermanentError = (error: {
  response?: { statusCode?: number };
  status?: number;
  message?: string;
}) => {
  const status = error?.response?.statusCode ?? error?.status;
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return true;
  }
  const message = error?.message?.toLowerCase() ?? '';
  return message.includes('opt-in');
};
