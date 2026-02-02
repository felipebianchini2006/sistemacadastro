import { ClicksignWebhookService } from './clicksign-webhook.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac } from 'crypto';
import { StorageService } from '../storage/storage.service';
import { JobsService } from '../jobs/jobs.service';
import { NotificationsService } from '../notifications/notifications.service';

const buildService = (overrides?: {
  secret?: string;
  prisma?: Partial<PrismaService>;
}) => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'CLICKSIGN_WEBHOOK_SECRET') return overrides?.secret;
      return undefined;
    }),
  } as unknown as ConfigService;

  const prisma = {
    auditLog: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async () => ({ id: 'log' })),
    },
    signatureEnvelope: {
      findFirst: jest.fn(async () => null),
      update: jest.fn(async () => ({})),
    },
    proposal: {
      update: jest.fn(async () => ({})),
    },
    ...overrides?.prisma,
  } as unknown as PrismaService;

  const storage = {
    uploadObject: jest.fn(),
  } as unknown as StorageService;

  const jobs = {
    enqueueTotvsSync: jest.fn(),
    enqueueSignatureAudit: jest.fn(),
  } as unknown as JobsService;

  const notifications = {
    notifyInternalCandidateSigned: jest.fn(),
  } as unknown as NotificationsService;

  return {
    service: new ClicksignWebhookService(
      prisma,
      config,
      storage,
      jobs,
      notifications,
    ),
    prisma,
    config,
  };
};

describe('ClicksignWebhookService', () => {
  it('validates HMAC signature', () => {
    const secret = 'test-secret';
    const { service } = buildService({ secret });
    const raw = Buffer.from(JSON.stringify({ hello: 'world' }));

    const signature = createHmac('sha256', secret).update(raw).digest('hex');

    expect(service.verifySignature(raw, signature)).toBe(true);
    expect(service.verifySignature(raw, 'invalid')).toBe(false);
  });

  it('is idempotent by eventId', async () => {
    const { service, prisma } = buildService({
      prisma: {
        auditLog: {
          findFirst: jest.fn(async () => ({ id: 'existing' })),
          create: jest.fn(async () => ({ id: 'log' })),
        },
      },
    });

    const payload = { id: 'event-123' };
    const raw = Buffer.from(JSON.stringify(payload));

    const result = await service.handleWebhook(payload, raw);

    expect(result.duplicated).toBe(true);
    expect(prisma.auditLog.findFirst).toHaveBeenCalled();
  });
});
