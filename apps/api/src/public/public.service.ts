import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType, ProposalStatus, ProposalType } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CryptoService } from '../common/crypto/crypto.service';
import {
  CreateDraftDto,
  SubmitProposalDto,
  UpdateDraftDto,
} from './public.dto';
import {
  validateDraftData,
  DraftData,
  validateEmailMx,
} from './public.validation';

const DEFAULT_DRAFT_TTL_DAYS = 7;

type SubmitRequestContext = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly notifications: NotificationsService,
    private readonly configService: ConfigService,
    private readonly crypto: CryptoService,
  ) {}

  async createDraft(dto: CreateDraftDto) {
    const data = dto.data ? this.safeValidate(dto.data) : undefined;

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const ttlDays = this.getDraftTtlDays();
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const draft = await this.prisma.draft.create({
      data: {
        tokenHash,
        expiresAt,
        data: data ?? {},
      },
    });

    return {
      draftId: draft.id,
      draftToken: token,
      expiresAt: draft.expiresAt.toISOString(),
    };
  }

  async updateDraft(
    draftId: string,
    dto: UpdateDraftDto,
    headerToken?: string,
  ) {
    const draft = await this.getDraftOrThrow(
      draftId,
      headerToken ?? dto.draftToken,
    );

    const incoming = this.safeValidate(dto.data);
    const merged = this.mergeDraftData(
      (draft.data ?? {}) as DraftData,
      incoming,
    );

    const updated = await this.prisma.draft.update({
      where: { id: draft.id },
      data: { data: merged },
    });

    return {
      draftId: updated.id,
      data: updated.data,
      expiresAt: updated.expiresAt.toISOString(),
    };
  }

  async getDraft(draftId: string, token?: string) {
    const draft = await this.getDraftOrThrow(draftId, token);

    return {
      draftId: draft.id,
      data: draft.data,
      expiresAt: draft.expiresAt.toISOString(),
    };
  }

  async submitProposal(
    dto: SubmitProposalDto,
    context: SubmitRequestContext = {},
  ) {
    const draft = await this.getDraftOrThrow(dto.draftId, dto.draftToken);

    const data = this.safeValidate(draft.data ?? {}, true);
    await this.ensureEmailMx(data.email);

    const protocol = await this.generateProtocol();
    const now = new Date();

    const personData = {
      fullName: data.fullName!,
      cpfEncrypted: await this.crypto.encrypt(data.cpf!),
      cpfHash: this.hashSearch(data.cpf!),
      emailEncrypted: await this.crypto.encrypt(data.email!.toLowerCase()),
      emailHash: this.hashSearch(data.email!.toLowerCase()),
      phoneEncrypted: await this.crypto.encrypt(data.phone!),
      phoneHash: this.hashSearch(data.phone!),
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
    };

    const addressData =
      data.address &&
      data.address.cep &&
      data.address.street &&
      data.address.district &&
      data.address.city &&
      data.address.state
        ? {
            cep: data.address.cep,
            street: data.address.street,
            number: data.address.number,
            complement: data.address.complement,
            district: data.address.district,
            city: data.address.city,
            state: data.address.state,
          }
        : undefined;

    const consentVersion =
      data.consent?.version ??
      this.configService.get<string>('CONSENT_VERSION', { infer: true }) ??
      'v1';
    const acceptedAt = data.consent?.at ? new Date(data.consent.at) : now;
    const acceptedAtSafe = Number.isNaN(acceptedAt.getTime())
      ? now
      : acceptedAt;

    const proposal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.proposal.create({
        data: {
          protocol,
          type: data.type ?? ProposalType.NOVO,
          status: ProposalStatus.SUBMITTED,
          submittedAt: now,
          draftId: draft.id,
          person: {
            create: personData,
          },
          address: addressData
            ? {
                create: addressData,
              }
            : undefined,
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: ProposalStatus.SUBMITTED,
              reason: 'Proposta submetida pelo candidato',
            },
          },
        },
      });

      await tx.consentLog.create({
        data: {
          proposalId: created.id,
          type: 'proposal',
          version: consentVersion,
          acceptedAt: acceptedAtSafe,
          ip: context.ip,
          userAgent: context.userAgent,
        },
      });

      return created;
    });

    const draftDocs = await this.prisma.documentFile.findMany({
      where: { draftId: draft.id },
      select: { id: true, type: true },
    });

    if (draftDocs.length > 0) {
      await this.prisma.documentFile.updateMany({
        where: { draftId: draft.id },
        data: { proposalId: proposal.id, draftId: null },
      });

      const ocrDocTypes = new Set<DocumentType>([
        DocumentType.RG_FRENTE,
        DocumentType.CNH,
      ]);
      const ocrDocs = draftDocs.filter((doc) => ocrDocTypes.has(doc.type));

      await Promise.all(
        ocrDocs.map((doc) =>
          this.jobs.enqueueOcr({
            proposalId: proposal.id,
            documentFileId: doc.id,
          }),
        ),
      );
    }

    const slaDays = 7;
    await this.notifications.notifyProposalReceived({
      proposalId: proposal.id,
      email: data.email!,
      phone: data.phone,
      protocol: proposal.protocol,
      deadlineDays: slaDays,
      whatsappOptIn: true,
    });

    await this.prisma.draft.delete({ where: { id: draft.id } });

    return {
      proposalId: proposal.id,
      protocol: proposal.protocol,
      trackingToken: proposal.publicToken,
    };
  }

  async trackProposal(protocol: string, token: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { protocol },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!proposal || proposal.publicToken !== token) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    const latestOcr = await this.prisma.ocrResult.findFirst({
      where: { proposalId: proposal.id },
      orderBy: { createdAt: 'desc' },
      select: {
        structuredData: true,
        createdAt: true,
      },
    });

    return {
      proposalId: proposal.id,
      protocol: proposal.protocol,
      status: proposal.status,
      timeline: proposal.statusHistory.map((entry) => ({
        from: entry.fromStatus,
        to: entry.toStatus,
        at: entry.createdAt,
        reason: entry.reason,
      })),
      pending: this.getPendingItems(proposal.status),
      ocr: latestOcr
        ? {
            at: latestOcr.createdAt,
            data: latestOcr.structuredData,
          }
        : null,
    };
  }

  async cleanupExpiredDrafts() {
    const now = new Date();
    const ttlDays = this.getDraftTtlDays();

    await this.prisma.documentFile.deleteMany({
      where: {
        draft: {
          expiresAt: { lt: now },
        },
      },
    });

    await this.prisma.draft.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    const orphanLimit = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);
    await this.prisma.documentFile.deleteMany({
      where: {
        proposalId: null,
        draftId: null,
        createdAt: { lt: orphanLimit },
      },
    });
  }

  private getPendingItems(status: ProposalStatus) {
    if (status === ProposalStatus.PENDING_DOCS) {
      return ['Documentos pendentes'];
    }
    if (status === ProposalStatus.PENDING_SIGNATURE) {
      return ['Assinatura pendente'];
    }
    return [];
  }

  private safeValidate(data: unknown, required = false) {
    try {
      return validateDraftData(data, required);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Dados invalidos';
      throw new BadRequestException(message);
    }
  }

  private async ensureEmailMx(email?: string) {
    const shouldCheck =
      this.configService.get<boolean>('EMAIL_MX_CHECK', {
        infer: true,
      }) ?? false;

    if (!shouldCheck || !email) return;

    const ok = await validateEmailMx(email);
    if (!ok) {
      throw new BadRequestException('Email invalido');
    }
  }

  private mergeDraftData(base: DraftData, incoming: DraftData): DraftData {
    return {
      ...base,
      ...incoming,
      address: {
        ...base.address,
        ...incoming.address,
      },
    };
  }

  private async getDraftOrThrow(draftId: string, token?: string) {
    if (!token) {
      throw new UnauthorizedException('Draft token ausente');
    }

    const draft = await this.prisma.draft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new NotFoundException('Draft nao encontrado');
    }

    if (draft.expiresAt < new Date()) {
      throw new UnauthorizedException('Draft expirado');
    }

    if (draft.tokenHash !== this.hashToken(token)) {
      throw new UnauthorizedException('Token invalido');
    }

    return draft;
  }

  private async generateProtocol() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const protocol = this.randomProtocol();
      const exists = await this.prisma.proposal.findUnique({
        where: { protocol },
        select: { id: true },
      });

      if (!exists) {
        return protocol;
      }
    }

    throw new BadRequestException('Nao foi possivel gerar protocolo');
  }

  private randomProtocol() {
    const min = 100000;
    const max = 99999999;
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return String(value);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashSearch(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private getDraftTtlDays() {
    return (
      this.configService.get<number>('RETENTION_DAYS_DRAFTS', {
        infer: true,
      }) ?? DEFAULT_DRAFT_TTL_DAYS
    );
  }
}
