import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'crypto';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JobsService } from '../src/jobs/jobs.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { DocumentType, ProposalStatus, ProposalType } from '@prisma/client';

const buildPrismaStub = () => {
  const drafts = new Map<string, any>();
  const proposalsByProtocol = new Map<string, any>();
  const statusHistory = new Map<string, any[]>();
  const documents: Array<{
    id: string;
    draftId?: string | null;
    proposalId?: string | null;
    type?: DocumentType;
  }> = [];

  const stub = {
    __documents: documents,
    draft: {
      create: jest.fn(async ({ data }) => {
        const id = randomUUID();
        const draft = { id, ...data };
        drafts.set(id, draft);
        return draft;
      }),
      findUnique: jest.fn(async ({ where }) => drafts.get(where.id) ?? null),
      update: jest.fn(async ({ where, data }) => {
        const draft = drafts.get(where.id);
        if (!draft) return null;
        const updated = { ...draft, ...data };
        drafts.set(where.id, updated);
        return updated;
      }),
      delete: jest.fn(async ({ where }) => {
        const draft = drafts.get(where.id);
        drafts.delete(where.id);
        return draft;
      }),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    person: {
      findFirst: jest.fn(async () => null),
    },
    proposal: {
      create: jest.fn(async ({ data }) => {
        const id = randomUUID();
        const proposal = {
          id,
          protocol: data.protocol,
          publicToken: 'tracking-token',
          status: data.status,
          type: data.type ?? ProposalType.NOVO,
        };
        proposalsByProtocol.set(data.protocol, proposal);

        if (data.statusHistory?.create) {
          statusHistory.set(id, [
            {
              ...data.statusHistory.create,
              createdAt: new Date(),
            },
          ]);
        }

        return proposal;
      }),
      findUnique: jest.fn(async ({ where, include }) => {
        const proposal = proposalsByProtocol.get(where.protocol) ?? null;
        if (!proposal) return null;
        if (include?.statusHistory) {
          return {
            ...proposal,
            statusHistory: statusHistory.get(proposal.id) ?? [],
          };
        }
        return proposal;
      }),
    },
    consentLog: {
      create: jest.fn(async () => ({ id: randomUUID() })),
    },
    auditLog: {
      create: jest.fn(async () => ({ id: randomUUID() })),
      createMany: jest.fn(async () => ({ count: 0 })),
      findFirst: jest.fn(async () => null),
    },
    documentFile: {
      findMany: jest.fn(async ({ where }) =>
        documents
          .filter((doc) => doc.draftId === where.draftId)
          .map((doc) => ({ id: doc.id, type: doc.type ?? DocumentType.CNH })),
      ),
      updateMany: jest.fn(async () => ({ count: 0 })),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    ocrResult: {
      findFirst: jest.fn(async () => null),
    },
  };

  return {
    ...stub,
    $transaction: jest.fn(async (input: any) => {
      if (typeof input === 'function') {
        return input({
          proposal: stub.proposal,
          consentLog: stub.consentLog,
          auditLog: stub.auditLog,
        });
      }
      if (Array.isArray(input)) {
        return Promise.all(input);
      }
      return input;
    }),
  } as unknown as PrismaService;
};

describe('Public flow (e2e)', () => {
  let app: INestApplication;
  let prismaStub: ReturnType<typeof buildPrismaStub>;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64');
    process.env.CLICKSIGN_ACCESS_TOKEN = 'test-clicksign-token';

    prismaStub = buildPrismaStub();
    const jobsStub = {
      enqueueOcr: jest.fn(),
      enqueueReceivedNotification: jest.fn(),
    } as unknown as JobsService;
    const notificationsStub = {
      notifyProposalReceived: jest.fn(),
      notifyInternalNewProposal: jest.fn(),
    } as unknown as NotificationsService;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .overrideProvider(JobsService)
      .useValue(jobsStub)
      .overrideProvider(NotificationsService)
      .useValue(notificationsStub)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, updates, submits and tracks a proposal', async () => {
    const create = await request(app.getHttpServer())
      .post('/public/drafts')
      .send({});

    expect(create.status).toBe(201);
    expect(create.body.draftId).toBeDefined();
    expect(create.body.draftToken).toBeDefined();

    const draftId = create.body.draftId;
    const draftToken = create.body.draftToken;

    const consentAt = new Date().toISOString();
    const payload = {
      data: {
        profileRoles: ['AUTOR'],
        fullName: 'Maria Silva',
        cpf: '935.411.347-80',
        email: 'maria@teste.com',
        phone: '(11)98888-7777',
        birthDate: '1990-01-01',
        type: 'NOVO',
        documentChoice: 'CNH',
        address: {
          cep: '01001-000',
          street: 'Rua Teste',
          district: 'Centro',
          city: 'Sao Paulo',
          state: 'SP',
        },
        consent: {
          accepted: true,
          version: 'v1',
          at: consentAt,
          privacyAccepted: true,
          privacyVersion: 'v1',
          privacyAt: consentAt,
        },
      },
    };

    const update = await request(app.getHttpServer())
      .patch(`/public/drafts/${draftId}`)
      .set('x-draft-token', draftToken)
      .send(payload);

    expect(update.status).toBe(200);
    expect(update.body.data.fullName).toBe('Maria Silva');

    prismaStub.__documents.push({
      id: 'doc-1',
      draftId,
      type: DocumentType.CNH,
    });

    const submit = await request(app.getHttpServer())
      .post('/public/proposals')
      .send({ draftId, draftToken });

    expect(submit.status).toBe(201);
    expect(submit.body.protocol).toBeDefined();
    expect(submit.body.trackingToken).toBeDefined();

    const track = await request(app.getHttpServer()).get(
      `/public/proposals/track?protocol=${submit.body.protocol}&token=${submit.body.trackingToken}`,
    );

    expect(track.status).toBe(200);
    expect(track.body.status).toBe(ProposalStatus.SUBMITTED);
  });
});
