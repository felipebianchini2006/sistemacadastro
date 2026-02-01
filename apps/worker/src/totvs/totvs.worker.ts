import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import {
  DocumentType,
  NotificationChannel,
  NotificationStatus,
  Prisma,
  ProposalStatus,
  TotvsSyncStatus,
  ProposalType,
} from '@prisma/client';
import { createHash } from 'crypto';

import { prisma } from '../prisma';
import { TotvsJobPayload } from './totvs.types';
import { decryptValue } from '../services/crypto';

export class TotvsWorker {
  private readonly connection: IORedis;
  private readonly worker: Worker<TotvsJobPayload>;
  private readonly notificationQueue: Queue;

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    const concurrency = parseNumber(process.env.TOTVS_CONCURRENCY, 2);
    this.notificationQueue = new Queue('notification-jobs', {
      connection: this.connection,
    });

    this.worker = new Worker<TotvsJobPayload>('totvs-jobs', (job) => this.handleJob(job), {
      connection: this.connection,
      concurrency,
    });

    this.worker.on('failed', (job, err) => {
      const requestId = job?.data?.requestId ?? job?.id ?? 'unknown';
      console.error({ requestId, err: err.message }, 'totvs.failed');
    });
  }

  async shutdown() {
    await this.worker.close();
    await this.notificationQueue.close();
    await this.connection.quit();
    await prisma.$disconnect();
  }

  private async handleJob(job: Job<TotvsJobPayload>) {
    if (job.name !== 'totvs.sync') {
      console.info({ jobId: job.id, jobName: job.name }, 'totvs.skipped');
      return;
    }

    const requestId = job.data.requestId ?? job.id ?? 'unknown';

    const proposal = await prisma.proposal.findUnique({
      where: { id: job.data.proposalId },
      include: {
        person: true,
        address: true,
        documents: true,
        totvsSync: true,
      },
    });

    if (!proposal || !proposal.person) {
      console.warn({ requestId, proposalId: job.data.proposalId }, 'totvs.missing_proposal');
      return;
    }

    if (proposal.totvsSync?.status === TotvsSyncStatus.SYNCED) {
      console.info({ requestId, proposalId: proposal.id }, 'totvs.already_synced');
      return;
    }

    if (![ProposalStatus.SIGNED, ProposalStatus.APPROVED].includes(proposal.status)) {
      console.info(
        { requestId, proposalId: proposal.id, status: proposal.status },
        'totvs.skip_status',
      );
      return;
    }

    const baseUrl = process.env.TOTVS_BASE_URL;
    const token = process.env.TOTVS_TOKEN;
    if (!baseUrl || !token) {
      throw new Error('TOTVS_BASE_URL or TOTVS_TOKEN not set');
    }

    const cpf = decryptValue(proposal.person.cpfEncrypted);
    const email = decryptValue(proposal.person.emailEncrypted);
    const phone = decryptValue(proposal.person.phoneEncrypted);

    const payload = buildTotvsPayload({
      proposalId: proposal.id,
      proposalType: proposal.type ?? ProposalType.NOVO,
      profileRoles: (proposal.profileRoles as string[] | null) ?? [],
      fullName: proposal.person.fullName,
      cpf,
      email,
      phone,
      birthDate: proposal.person.birthDate ?? undefined,
      documents: proposal.documents,
      requestId,
    });

    await prisma.totvsSync.upsert({
      where: { proposalId: proposal.id },
      create: {
        proposalId: proposal.id,
        status: TotvsSyncStatus.PENDING,
        map: { requestId },
      },
      update: {
        status: TotvsSyncStatus.PENDING,
        map: { requestId },
      },
    });

    const response = await sendTotvsRequest(baseUrl, token, payload);

    if (response.ok || response.status === 409) {
      const externalId = response.externalId ?? null;
      await prisma.totvsSync.upsert({
        where: { proposalId: proposal.id },
        create: {
          proposalId: proposal.id,
          status: TotvsSyncStatus.SYNCED,
          externalId,
          lastSyncAt: new Date(),
          map: { requestId, status: response.status },
        },
        update: {
          status: TotvsSyncStatus.SYNCED,
          externalId,
          lastSyncAt: new Date(),
          map: { requestId, status: response.status },
        },
      });

      if (proposal.status !== ProposalStatus.APPROVED) {
        await prisma.proposal.update({
          where: { id: proposal.id },
          data: {
            status: ProposalStatus.APPROVED,
            approvedAt: new Date(),
            statusHistory: {
              create: {
                fromStatus: proposal.status,
                toStatus: ProposalStatus.APPROVED,
                reason: 'Sincronizado com Totvs',
              },
            },
          },
        });
      }

      const memberNumber = externalId ?? proposal.totvsSync?.externalId ?? '';
      await this.queueNotification({
        proposalId: proposal.id,
        channel: NotificationChannel.EMAIL,
        to: email,
        template: 'proposal_concluded',
        data: { memberNumber },
      });

      if (phone) {
        await this.queueNotification({
          proposalId: proposal.id,
          channel: NotificationChannel.WHATSAPP,
          to: phone,
          template: 'proposal_concluded',
          data: { memberNumber },
          optIn: true,
        });
      }

      console.info({ requestId, proposalId: proposal.id }, 'totvs.synced');
      return;
    }

    await prisma.totvsSync.upsert({
      where: { proposalId: proposal.id },
      create: {
        proposalId: proposal.id,
        status: TotvsSyncStatus.FAILED,
        map: { requestId, status: response.status, error: response.error },
      },
      update: {
        status: TotvsSyncStatus.FAILED,
        map: { requestId, status: response.status, error: response.error },
      },
    });

    throw new Error(response.error ?? `Totvs sync failed (${response.status})`);
  }

  private async queueNotification(input: {
    proposalId: string;
    channel: NotificationChannel;
    to: string;
    template: string;
    data: Record<string, unknown>;
    optIn?: boolean;
  }) {
    const notification = await prisma.notification.create({
      data: {
        proposalId: input.proposalId,
        channel: input.channel,
        status: NotificationStatus.PENDING,
        payloadRedacted: {
          toHash: hashValue(input.to),
          toMasked: maskContact(input.to),
          template: input.template,
          dataKeys: Object.keys(input.data ?? {}),
          optIn: input.optIn ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    const jobName =
      input.channel === NotificationChannel.EMAIL
        ? 'notify.email'
        : input.channel === NotificationChannel.SMS
          ? 'notify.sms'
          : 'notify.whatsapp';

    await this.notificationQueue.add(
      jobName,
      {
        notificationId: notification.id,
        to: input.to,
        template: input.template,
        data: input.data,
        requestId: notification.id,
        optIn: input.optIn,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }
}

const sendTotvsRequest = async (baseUrl: string, token: string, payload: any) => {
  const controller = new AbortController();
  const timeoutMs = parseNumber(process.env.TOTVS_TIMEOUT_MS, 15000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL('/api/totvs/v1/associados', baseUrl);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      externalId: extractExternalId(json),
      error: response.ok ? undefined : text || response.statusText,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const buildTotvsPayload = (input: {
  proposalId: string;
  proposalType: ProposalType;
  profileRoles: string[];
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  birthDate?: Date | null;
  documents: Array<{ type: DocumentType; storageKey: string }>;
  requestId: string;
}) => {
  const cpfDigits = input.cpf.replace(/\D+/g, '');
  const phoneFormatted = formatPhone(input.phone);
  const birth = input.birthDate ? formatDate(input.birthDate) : undefined;

  const rgDoc = input.documents.find((doc) => doc.type === DocumentType.RG_FRENTE);
  const cnhDoc = input.documents.find((doc) => doc.type === DocumentType.CNH);
  const comprovante = input.documents.find(
    (doc) => doc.type === DocumentType.COMPROVANTE_RESIDENCIA,
  );

  return {
    nome: input.fullName,
    cpf: cpfDigits,
    data_nascimento: birth,
    email: input.email,
    telefone: phoneFormatted,
    perfil_artistico: input.profileRoles,
    documentos: {
      rg: rgDoc?.storageKey ?? cnhDoc?.storageKey ?? null,
      comprovante: comprovante?.storageKey ?? null,
    },
    metadata: {
      proposalId: input.proposalId,
      proposalType: input.proposalType,
      requestId: input.requestId,
    },
  };
};

const extractExternalId = (payload: any) => {
  if (!payload) return undefined;
  if (payload.id) return String(payload.id);
  if (payload.externalId) return String(payload.externalId);
  if (payload.data?.id) return String(payload.data.id);
  if (payload.data?.attributes?.id) return String(payload.data.attributes.id);
  return undefined;
};

const formatDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D+/g, '');
  if (digits.length >= 10) {
    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);
    if (number.length === 9) {
      return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
    }
    if (number.length === 8) {
      return `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
    }
  }
  return value;
};

const hashValue = (value: string) => createHash('sha256').update(value).digest('hex');

const maskContact = (value: string) => {
  if (value.includes('@')) {
    const [user, domain] = value.split('@');
    if (!domain) return '***';
    return `${user?.slice(0, 2) ?? '**'}***@${domain}`;
  }
  const digits = value.replace(/\D+/g, '');
  if (digits.length <= 4) return '***';
  return `***${digits.slice(-4)}`;
};

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = value ? Number(value) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
};
