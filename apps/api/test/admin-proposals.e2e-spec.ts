import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { SignatureService } from '../src/signature/signature.service';
import { JobsService } from '../src/jobs/jobs.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { RoleName } from '@prisma/client';
import { createCipheriv, randomBytes } from 'crypto';

const buildPrismaStub = () => {
  const key = Buffer.from(
    process.env.DATA_ENCRYPTION_KEY ?? Buffer.alloc(32).toString('base64'),
    'base64',
  );

  const encrypt = (value: string) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  };

  const proposal = {
    id: 'proposal-1',
    status: 'SUBMITTED',
    protocol: '123456',
    publicToken: 'token',
    person: {
      fullName: 'Maria Silva',
      emailEncrypted: encrypt('maria@teste.com'),
      phoneEncrypted: encrypt('+5511999999999'),
    },
  };

  return {
    proposal: {
      findUnique: jest.fn(async () => proposal),
      update: jest.fn(async () => proposal),
    },
    auditLog: {
      create: jest.fn(async () => ({ id: 'log' })),
    },
  } as unknown as PrismaService;
};

describe('Admin proposals (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const prismaStub = buildPrismaStub();
    const notificationsStub = {
      notifyPending: jest.fn(),
      notifyRejected: jest.fn(),
      notifyProposalReceived: jest.fn(),
      notifyApproved: jest.fn(),
      notifySigned: jest.fn(),
    } as unknown as NotificationsService;
    const signatureStub = {
      requestSignature: jest.fn(async () => ({ ok: true, requestId: 'req-1' })),
    } as unknown as SignatureService;
    const jobsStub = {
      enqueueOcr: jest.fn(),
      enqueuePdf: jest.fn(),
      enqueueSignature: jest.fn(),
      enqueueReceivedNotification: jest.fn(),
      enqueueEmailNotification: jest.fn(),
      enqueueSmsNotification: jest.fn(),
      enqueueWhatsappNotification: jest.fn(),
    } as unknown as JobsService;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .overrideProvider(NotificationsService)
      .useValue(notificationsStub)
      .overrideProvider(SignatureService)
      .useValue(signatureStub)
      .overrideProvider(JobsService)
      .useValue(jobsStub)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'admin', roles: [RoleName.ADMIN] };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('approves a proposal', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/proposals/proposal-1/approve')
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.requestId).toBe('req-1');
  });

  it('requests changes', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/proposals/proposal-1/request-changes')
      .send({ missingItems: ['RG'] });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
  });
});
