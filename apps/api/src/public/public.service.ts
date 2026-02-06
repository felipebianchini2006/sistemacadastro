import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DocumentType,
  ProposalStatus,
  ProposalType,
  Prisma,
  SocialProvider,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OtpService } from '../notifications/otp.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateDraftDto,
  SubmitProposalDto,
  UpdateDraftDto,
} from './public.dto';
import {
  validateDraftData,
  DraftData,
  validateEmailMx,
  validateOtpSend,
  validateOtpVerify,
  validateDeleteProposal,
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
    private readonly otpService: OtpService,
    private readonly storage: StorageService,
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
      data: this.sanitizeDraftResponse(updated.data),
      expiresAt: updated.expiresAt.toISOString(),
    };
  }

  async getDraft(draftId: string, token?: string) {
    const draft = await this.getDraftOrThrow(draftId, token);

    return {
      draftId: draft.id,
      data: this.sanitizeDraftResponse(draft.data),
      expiresAt: draft.expiresAt.toISOString(),
    };
  }

  async requestDraftOcr(draftId: string, token?: string) {
    const draft = await this.getDraftOrThrow(draftId, token);

    const draftDocs = await this.prisma.documentFile.findMany({
      where: { draftId: draft.id },
      select: { id: true, type: true },
    });

    const ocrDocTypes = new Set<DocumentType>([
      DocumentType.RG_FRENTE,
      DocumentType.CNH,
      DocumentType.COMPROVANTE_RESIDENCIA,
    ]);
    const ocrDocs = draftDocs.filter((doc) => ocrDocTypes.has(doc.type));

    if (ocrDocs.length === 0) {
      throw new BadRequestException('Nenhum documento disponivel para OCR');
    }

    await Promise.all(
      ocrDocs.map((doc) =>
        this.jobs.enqueueOcr({
          draftId: draft.id,
          documentFileId: doc.id,
        }),
      ),
    );

    return { ok: true, count: ocrDocs.length };
  }

  async getDraftOcr(draftId: string, token?: string) {
    const draft = await this.getDraftOrThrow(draftId, token);

    const results = await this.prisma.ocrResult.findMany({
      where: { draftId: draft.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      draftId: draft.id,
      results,
    };
  }

  async submitProposal(
    dto: SubmitProposalDto,
    context: SubmitRequestContext = {},
  ) {
    const draft = await this.getDraftOrThrow(dto.draftId, dto.draftToken);

    const data = this.safeValidate(
      this.stripInternalDraftData(draft.data ?? {}),
      true,
    );
    await this.ensureEmailMx(data.email);

    const protocol = await this.generateProtocol();
    const now = new Date();
    const emailNormalized = data.email!.toLowerCase();
    const emailHash = this.hashSearch(emailNormalized);
    const cpfHash = this.hashSearch(data.cpf!);

    const existingEmail = await this.prisma.person.findFirst({
      where: { emailHash },
      select: { id: true },
    });
    if (existingEmail) {
      throw new BadRequestException('Email ja utilizado');
    }

    const bankData = await this.buildBankAccountData(data.bank);
    const personData = {
      fullName: data.fullName!,
      cpfEncrypted: await this.crypto.encrypt(data.cpf!),
      cpfHash,
      emailEncrypted: await this.crypto.encrypt(emailNormalized),
      emailHash,
      phoneEncrypted: await this.crypto.encrypt(data.phone!),
      phoneHash: this.hashSearch(data.phone!),
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      bankAccounts: bankData
        ? {
            create: bankData,
          }
        : undefined,
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
    const privacyVersion =
      data.consent?.privacyVersion ??
      this.configService.get<string>('PRIVACY_POLICY_VERSION', {
        infer: true,
      }) ??
      'v1';
    const acceptedAt = data.consent?.at ? new Date(data.consent.at) : now;
    const acceptedAtSafe = Number.isNaN(acceptedAt.getTime())
      ? now
      : acceptedAt;
    const privacyAt = data.consent?.privacyAt
      ? new Date(data.consent.privacyAt)
      : acceptedAtSafe;
    const privacyAtSafe = Number.isNaN(privacyAt.getTime())
      ? acceptedAtSafe
      : privacyAt;

    const draftDocs = await this.prisma.documentFile.findMany({
      where: { draftId: draft.id },
      select: { id: true, type: true },
    });

    const docTypes = new Set(draftDocs.map((doc) => doc.type));
    if (data.documentChoice === 'RG') {
      if (
        !docTypes.has(DocumentType.RG_FRENTE) ||
        !docTypes.has(DocumentType.RG_VERSO)
      ) {
        throw new BadRequestException('RG frente e verso obrigatorios');
      }
    }
    if (data.documentChoice === 'CNH') {
      if (!docTypes.has(DocumentType.CNH)) {
        throw new BadRequestException('CNH obrigatoria');
      }
    }
    if (
      data.type === ProposalType.MIGRACAO &&
      !docTypes.has(DocumentType.DESFILIACAO)
    ) {
      throw new BadRequestException('Documento de desfiliação obrigatorio');
    }

    const draftSocialAuth = this.extractDraftSocialAuth(draft.data ?? {});

    const proposal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.proposal.create({
        data: {
          protocol,
          type: data.type ?? ProposalType.NOVO,
          status: ProposalStatus.SUBMITTED,
          submittedAt: now,
          draftId: draft.id,
          profileRoles: data.profileRoles ?? undefined,
          profileRoleOther: data.profileRoleOther ?? undefined,
          migrationEntity: data.migrationEntity ?? undefined,
          migrationConfirmed: data.migrationConfirmed ?? undefined,
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
        include: { person: true },
      });

      if (created.person && draftSocialAuth.length > 0) {
        await tx.socialAccount.createMany({
          data: draftSocialAuth.map((entry) => ({
            personId: created.person!.id,
            provider: entry.provider,
            accessTokenEncrypted: entry.accessTokenEncrypted,
            refreshTokenEncrypted: entry.refreshTokenEncrypted ?? null,
            tokenMeta: entry.tokenMeta as Prisma.InputJsonValue,
          })),
        });

        await tx.auditLog.createMany({
          data: draftSocialAuth.map((entry) => ({
            proposalId: created.id,
            action: 'SOCIAL_CONNECT',
            entityType: 'Proposal',
            entityId: created.id,
            metadata: {
              provider: entry.provider,
              source: 'draft',
            } as Prisma.InputJsonValue,
          })),
        });
      }

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

      await tx.consentLog.create({
        data: {
          proposalId: created.id,
          type: 'privacy',
          version: privacyVersion,
          acceptedAt: privacyAtSafe,
          ip: context.ip,
          userAgent: context.userAgent,
        },
      });

      return created;
    });

    if (draftDocs.length > 0) {
      await this.prisma.documentFile.updateMany({
        where: { draftId: draft.id },
        data: { proposalId: proposal.id, draftId: null },
      });

      const ocrDocTypes = new Set<DocumentType>([
        DocumentType.RG_FRENTE,
        DocumentType.CNH,
        DocumentType.COMPROVANTE_RESIDENCIA,
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

    await this.notifications.notifyInternalNewProposal({
      proposalId: proposal.id,
      protocol: proposal.protocol,
      name: personData.fullName,
    });

    await this.prisma.draft.delete({ where: { id: draft.id } });

    return {
      proposalId: proposal.id,
      protocol: proposal.protocol,
      trackingToken: proposal.publicToken,
    };
  }

  async trackProposal(
    protocol: string,
    token: string,
    context: SubmitRequestContext = {},
  ) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { protocol },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
        person: {
          include: {
            socialAccounts: true,
            bankAccounts: true,
          },
        },
      },
    });

    if (!proposal || proposal.publicToken !== token) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    await this.prisma.auditLog.create({
      data: {
        proposalId: proposal.id,
        action: 'PUBLIC_TRACK',
        entityType: 'Proposal',
        entityId: proposal.id,
        ip: context.ip,
        userAgent: context.userAgent,
      },
    });

    const latestOcr = await this.prisma.ocrResult.findFirst({
      where: { proposalId: proposal.id },
      orderBy: { createdAt: 'desc' },
      select: {
        structuredData: true,
        createdAt: true,
      },
    });

    const latestPending = await this.prisma.auditLog.findFirst({
      where: {
        proposalId: proposal.id,
        action: 'REQUEST_CHANGES',
      },
      orderBy: { createdAt: 'desc' },
      select: { metadata: true },
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
      pending: this.getPendingItems(proposal.status, latestPending?.metadata),
      socialAccounts:
        proposal.person?.socialAccounts?.map((account) => ({
          provider: account.provider,
          connectedAt: account.createdAt,
        })) ?? [],
      bankAccount: (proposal.person?.bankAccounts?.length ?? 0) > 0,
      ocr: latestOcr
        ? {
            at: latestOcr.createdAt,
            data: latestOcr.structuredData,
          }
        : null,
    };
  }

  async sendOtp(payload: unknown) {
    const data = this.safeValidateOtpSend(payload);
    const proposal = await this.prisma.proposal.findUnique({
      where: { protocol: data.protocol },
      include: { person: true },
    });

    if (!proposal || !proposal.person) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    const storedPhone = await this.crypto.decrypt(
      proposal.person.phoneEncrypted,
    );

    if (!this.matchPhone(storedPhone, data.phone)) {
      throw new BadRequestException('Telefone nao confere');
    }

    await this.otpService.sendOtp({
      to: data.phone,
      channel: data.channel,
    });

    await this.prisma.auditLog.create({
      data: {
        proposalId: proposal.id,
        action: 'OTP_SENT',
        entityType: 'Proposal',
        entityId: proposal.id,
        metadata: { channel: data.channel },
      },
    });

    return { ok: true };
  }

  async verifyOtp(payload: unknown) {
    const data = this.safeValidateOtpVerify(payload);
    const proposal = await this.prisma.proposal.findUnique({
      where: { protocol: data.protocol },
      include: { person: true },
    });

    if (!proposal || !proposal.person) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    const storedPhone = await this.crypto.decrypt(
      proposal.person.phoneEncrypted,
    );

    if (!this.matchPhone(storedPhone, data.phone)) {
      throw new BadRequestException('Telefone nao confere');
    }

    const result = await this.otpService.verifyOtp({
      to: data.phone,
      code: data.code,
    });

    const status = (result as { status?: string }).status ?? 'unknown';
    if (status !== 'approved') {
      throw new BadRequestException('Codigo invalido');
    }

    await this.prisma.auditLog.create({
      data: {
        proposalId: proposal.id,
        action: 'OTP_VERIFIED',
        entityType: 'Proposal',
        entityId: proposal.id,
      },
    });

    return {
      ok: true,
      token: proposal.publicToken,
      proposalId: proposal.id,
    };
  }

  async deleteProposal(payload: unknown, context: SubmitRequestContext = {}) {
    const data = this.safeValidateDeleteProposal(payload);

    const proposal = await this.prisma.proposal.findUnique({
      where: { protocol: data.protocol },
      include: {
        documents: true,
        signatures: true,
      },
    });

    if (!proposal || proposal.publicToken !== data.token) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    // Delete all files from S3: documents + signed files + certificates
    const storageErrors: string[] = [];
    const filesToDelete: string[] = [];

    // Add document files
    proposal.documents.forEach((doc) => {
      filesToDelete.push(doc.storageKey);
    });

    // Add signed files and certificates from signature envelopes
    proposal.signatures.forEach((sig) => {
      if (sig.signedFileKey) filesToDelete.push(sig.signedFileKey);
      if (sig.certificateFileKey) filesToDelete.push(sig.certificateFileKey);
    });

    // Delete all files from S3
    await Promise.all(
      filesToDelete.map(async (key) => {
        try {
          await this.storage.deleteObject(key);
        } catch (error) {
          storageErrors.push(key);
        }
      }),
    );

    // Delete proposal from database (cascade will handle relations)
    await this.prisma.$transaction(async (tx) => {
      // Create audit log for LGPD compliance
      await tx.auditLog.create({
        data: {
          proposalId: proposal.id,
          action: 'ERASURE_REQUEST',
          entityType: 'Proposal',
          entityId: proposal.id,
          ip: context.ip,
          userAgent: context.userAgent,
          metadata: {
            protocol: proposal.protocol,
            deletedDocuments: proposal.documents.length,
            deletedSignatures: proposal.signatures.length,
            deletedFiles: filesToDelete.length,
            storageErrors,
          },
        },
      });

      // Anonymize notification payloads (LGPD compliance)
      await tx.notification.updateMany({
        where: { proposalId: proposal.id },
        data: {
          payloadRedacted: {
            anonymized: true,
            erasedAt: new Date().toISOString(),
          },
        },
      });

      // Delete proposal (cascade will delete Person, Address, Documents, etc.)
      await tx.proposal.delete({ where: { id: proposal.id } });
    });

    return {
      ok: true,
      deletedDocuments: proposal.documents.length,
      deletedSignatures: proposal.signatures.length,
      deletedFiles: filesToDelete.length,
      storageErrors,
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

  private getPendingItems(status: ProposalStatus, metadata?: unknown) {
    if (status === ProposalStatus.PENDING_DOCS) {
      const raw = metadata as { missingItems?: unknown } | null;
      const missingItems = Array.isArray(raw?.missingItems)
        ? raw?.missingItems
            .filter((item) => typeof item === 'string')
            .map(String)
        : [];
      if (missingItems.length > 0) {
        return missingItems.map((item) => `Documento: ${item}`);
      }
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

  private stripInternalDraftData(data: unknown) {
    if (!data || typeof data !== 'object') return data;
    const clone = { ...(data as Record<string, unknown>) };
    delete clone.socialAuth;
    delete clone.socialConnections;
    return clone;
  }

  private sanitizeDraftResponse(data: unknown) {
    if (!data || typeof data !== 'object') return data;
    const clone = { ...(data as Record<string, unknown>) };
    delete clone.socialAuth;
    return clone;
  }

  private extractDraftSocialAuth(data: unknown) {
    if (!data || typeof data !== 'object') return [];
    const raw = (data as Record<string, unknown>).socialAuth;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const typed = entry as {
          provider?: SocialProvider | string;
          accessTokenEncrypted?: string;
          refreshTokenEncrypted?: string | null;
          tokenMeta?: Record<string, unknown>;
        };
        if (!typed.provider || !typed.accessTokenEncrypted) return null;
        return {
          provider: typed.provider as SocialProvider,
          accessTokenEncrypted: typed.accessTokenEncrypted,
          refreshTokenEncrypted: typed.refreshTokenEncrypted ?? null,
          tokenMeta: typed.tokenMeta ?? {},
        };
      })
      .filter(Boolean) as Array<{
      provider: SocialProvider;
      accessTokenEncrypted: string;
      refreshTokenEncrypted: string | null;
      tokenMeta: Record<string, unknown>;
    }>;
  }

  private safeValidateOtpSend(payload: unknown) {
    try {
      return validateOtpSend(payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Dados invalidos';
      throw new BadRequestException(message);
    }
  }

  private safeValidateOtpVerify(payload: unknown) {
    try {
      return validateOtpVerify(payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Dados invalidos';
      throw new BadRequestException(message);
    }
  }

  private safeValidateDeleteProposal(payload: unknown) {
    try {
      return validateDeleteProposal(payload);
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
        ...(base.address ?? {}),
        ...(incoming.address ?? {}),
      },
      bank: {
        ...(base.bank ?? {}),
        ...(incoming.bank ?? {}),
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

  private matchPhone(left: string, right: string) {
    const leftDigits = left.replace(/\D+/g, '');
    const rightDigits = right.replace(/\D+/g, '');
    return leftDigits === rightDigits;
  }

  private async buildBankAccountData(bank?: DraftData['bank']) {
    if (!bank) return null;
    const hasAny = Object.values(bank).some((value) => value);
    if (!hasAny) return null;
    if (!bank.account) return null;

    return {
      bankCode: bank.bankCode,
      bankName: bank.bankName,
      agencyEncrypted: bank.agency
        ? await this.crypto.encrypt(bank.agency)
        : null,
      accountEncrypted: await this.crypto.encrypt(bank.account),
      accountType: bank.accountType ?? null,
      holderName: bank.holderName,
      holderDocumentEncrypted: bank.holderDocument
        ? await this.crypto.encrypt(bank.holderDocument)
        : null,
      pixKeyEncrypted: bank.pixKey
        ? await this.crypto.encrypt(bank.pixKey)
        : null,
      pixKeyType: bank.pixKeyType,
    };
  }
}
