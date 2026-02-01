import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { exec } from 'child_process';
import { promisify } from 'util';

import { prisma } from '../prisma';
import { StorageClient } from '../services/storage-client';

const execAsync = promisify(exec);

type MaintenanceJobPayload = {
  requestId?: string;
  command?: string;
};

export class MaintenanceWorker {
  private readonly connection: IORedis;
  private readonly worker: Worker<MaintenanceJobPayload>;
  private readonly storage: StorageClient;

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.storage = new StorageClient();

    this.worker = new Worker<MaintenanceJobPayload>(
      'maintenance-jobs',
      (job) => this.handleJob(job),
      {
        connection: this.connection,
        concurrency: 1,
      },
    );

    this.worker.on('failed', (job, err) => {
      const requestId = job?.data?.requestId ?? job?.id ?? 'unknown';
      console.error({ requestId, err: err.message }, 'maintenance.failed');
    });
  }

  async shutdown() {
    await this.worker.close();
    await this.connection.quit();
    await prisma.$disconnect();
  }

  private async handleJob(job: Job<MaintenanceJobPayload>) {
    if (job.name === 'maintenance.cleanup') {
      await this.handleCleanup(job);
      return;
    }

    if (job.name === 'maintenance.backup') {
      await this.handleBackup(job);
      return;
    }

    console.info({ jobId: job.id, jobName: job.name }, 'maintenance.skipped');
  }

  private async handleCleanup(job: Job<MaintenanceJobPayload>) {
    const requestId = job.data.requestId ?? job.id ?? 'unknown';
    const startedAt = Date.now();

    const auditDays = parseNumber(process.env.RETENTION_DAYS_AUDIT_LOGS, 365);
    const notificationDays = parseNumber(process.env.RETENTION_DAYS_NOTIFICATIONS, 180);
    const documentDays = parseNumber(process.env.RETENTION_DAYS_DOCUMENTS, 365);

    const auditCutoff = daysAgo(auditDays);
    const notificationCutoff = daysAgo(notificationDays);
    const documentCutoff = daysAgo(documentDays);

    const auditDeleted = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: auditCutoff } },
    });

    const notificationDeleted = await prisma.notification.deleteMany({
      where: { createdAt: { lt: notificationCutoff } },
    });

    const documentsDeleted = await this.cleanupDocuments(documentCutoff);

    const durationMs = Date.now() - startedAt;
    console.info(
      {
        requestId,
        auditDeleted: auditDeleted.count,
        notificationDeleted: notificationDeleted.count,
        documentsDeleted,
        durationMs,
      },
      'maintenance.cleanup.done',
    );
  }

  private async handleBackup(job: Job<MaintenanceJobPayload>) {
    const requestId = job.data.requestId ?? job.id ?? 'unknown';
    const command = job.data.command ?? process.env.BACKUP_COMMAND;

    if (!command) {
      console.info({ requestId }, 'maintenance.backup.skipped');
      return;
    }

    const startedAt = Date.now();
    const result = await execAsync(command, {
      shell: process.env.ComSpec,
      env: process.env,
      timeout: 1000 * 60 * 30,
    });
    const durationMs = Date.now() - startedAt;

    console.info(
      {
        requestId,
        durationMs,
        stdout: result.stdout?.slice(0, 5000),
        stderr: result.stderr?.slice(0, 5000),
      },
      'maintenance.backup.done',
    );
  }

  private async cleanupDocuments(cutoff: Date, batchSize = 50) {
    let totalDeleted = 0;

    while (true) {
      const batch = await prisma.documentFile.findMany({
        where: { createdAt: { lt: cutoff } },
        select: { id: true, storageKey: true },
        orderBy: { createdAt: 'asc' },
        take: batchSize,
      });

      if (batch.length === 0) {
        break;
      }

      await Promise.all(
        batch.map(async (doc) => {
          try {
            await this.storage.delete(doc.storageKey);
          } catch (error) {
            console.warn(
              { documentId: doc.id, err: error instanceof Error ? error.message : error },
              'maintenance.document.delete_failed',
            );
          }
        }),
      );

      await prisma.documentFile.deleteMany({
        where: { id: { in: batch.map((doc) => doc.id) } },
      });

      totalDeleted += batch.length;
    }

    return totalDeleted;
  }
}

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = value ? Number(value) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
};

const daysAgo = (days: number) => {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};
