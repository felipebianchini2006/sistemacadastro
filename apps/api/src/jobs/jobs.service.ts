import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class JobsService implements OnModuleDestroy {
  private readonly queue: Queue;
  private readonly signatureQueue: Queue;
  private readonly notificationQueue: Queue;
  private readonly maintenanceQueue: Queue;
  private readonly totvsQueue: Queue;
  private readonly connection: IORedis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl =
      this.configService.get<string>('REDIS_URL', { infer: true }) ??
      'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue('public-jobs', { connection: this.connection });
    this.signatureQueue = new Queue('signature-jobs', {
      connection: this.connection,
    });
    this.notificationQueue = new Queue('notification-jobs', {
      connection: this.connection,
    });
    this.maintenanceQueue = new Queue('maintenance-jobs', {
      connection: this.connection,
    });
    this.totvsQueue = new Queue('totvs-jobs', {
      connection: this.connection,
    });
  }

  async enqueueOcr(payload: {
    proposalId?: string;
    draftId?: string;
    documentFileId: string;
    requestId?: string;
  }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.queue.add(
      'ocr.process',
      {
        proposalId: payload.proposalId,
        draftId: payload.draftId,
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

  async enqueuePdf(payload: {
    proposalId: string;
    protocol: string;
    candidate: { name: string; email: string; phone?: string };
    requestId?: string;
  }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.signatureQueue.add(
      'pdf.generate',
      {
        proposalId: payload.proposalId,
        protocol: payload.protocol,
        candidate: payload.candidate,
        requestId,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }

  async enqueueDossierPdf(payload: {
    proposalId: string;
    protocol: string;
    requestId?: string;
  }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.signatureQueue.add(
      'dossier.generate',
      {
        proposalId: payload.proposalId,
        protocol: payload.protocol,
        requestId,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }

  async enqueueSignature(payload: {
    proposalId: string;
    documentFileId: string;
    protocol: string;
    candidate: { name: string; email: string; phone?: string };
    requestId?: string;
  }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.signatureQueue.add(
      'signature.create',
      {
        proposalId: payload.proposalId,
        documentFileId: payload.documentFileId,
        protocol: payload.protocol,
        candidate: payload.candidate,
        requestId,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }

  async enqueueSignatureCancel(payload: {
    proposalId: string;
    envelopeId: string;
    requestId?: string;
  }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.signatureQueue.add(
      'signature.cancel',
      {
        proposalId: payload.proposalId,
        envelopeId: payload.envelopeId,
        requestId,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }

  async enqueueSignatureAudit(payload: {
    proposalId: string;
    envelopeId: string;
    requestId?: string;
  }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.signatureQueue.add(
      'signature.audit',
      {
        proposalId: payload.proposalId,
        envelopeId: payload.envelopeId,
        requestId,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }

  async enqueueEmailNotification(payload: {
    notificationId: string;
    to: string;
    template: string;
    data: Record<string, unknown>;
    requestId?: string;
  }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.notificationQueue.add(
      'notify.email',
      {
        notificationId: payload.notificationId,
        to: payload.to,
        template: payload.template,
        data: payload.data,
        requestId,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }

  async enqueueSmsNotification(payload: {
    notificationId: string;
    to: string;
    template: string;
    data: Record<string, unknown>;
    requestId?: string;
  }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.notificationQueue.add(
      'notify.sms',
      {
        notificationId: payload.notificationId,
        to: payload.to,
        template: payload.template,
        data: payload.data,
        requestId,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }

  async enqueueWhatsappNotification(payload: {
    notificationId: string;
    to: string;
    template: string;
    data: Record<string, unknown>;
    requestId?: string;
    optIn?: boolean;
  }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.notificationQueue.add(
      'notify.whatsapp',
      {
        notificationId: payload.notificationId,
        to: payload.to,
        template: payload.template,
        data: payload.data,
        requestId,
        optIn: payload.optIn,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }

  async enqueuePushNotification(payload: {
    notificationId: string;
    subscriptionId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    title: string;
    body: string;
    url?: string;
    requestId?: string;
  }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.notificationQueue.add(
      'notify.push',
      { ...payload, requestId },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }

  async enqueueMaintenanceCleanup(payload: { requestId?: string }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.maintenanceQueue.add(
      'maintenance.cleanup',
      { requestId },
      {
        removeOnComplete: true,
        attempts: 2,
        backoff: { type: 'exponential', delay: 60000 },
      },
    );
  }

  async enqueueMaintenanceBackup(payload: {
    command?: string;
    requestId?: string;
  }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.maintenanceQueue.add(
      'maintenance.backup',
      { requestId, command: payload.command },
      {
        removeOnComplete: true,
        attempts: 2,
        backoff: { type: 'exponential', delay: 60000 },
      },
    );
  }

  async enqueueTotvsSync(payload: { proposalId: string; requestId?: string }) {
    const requestId = payload.requestId ?? randomUUID();
    await this.totvsQueue.add(
      'totvs.sync',
      {
        proposalId: payload.proposalId,
        requestId,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
      },
    );
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.signatureQueue.close();
    await this.notificationQueue.close();
    await this.maintenanceQueue.close();
    await this.totvsQueue.close();
    await this.connection.quit();
  }
}
