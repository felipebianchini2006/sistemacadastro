import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType, ProposalStatus, ProposalType } from '@prisma/client';
import { createHash, createCipheriv, randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import {
  CreateDraftDto,
  SubmitProposalDto,
  UpdateDraftDto,
} from './public.dto';
import { validateDraftData, DraftData } from './public.validation';

const DRAFT_TTL_DAYS = 7;

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly configService: ConfigService,
  ) {}

  async createDraft(dto: CreateDraftDto) {
    const data = dto.data ? this.safeValidate(dto.data) : undefined;

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(
      Date.now() + DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

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

  async submitProposal(dto: SubmitProposalDto) {
    const draft = await this.getDraftOrThrow(dto.draftId, dto.draftToken);

    const data = this.safeValidate(draft.data ?? {}, true);

    const protocol = await this.generateProtocol();
    const now = new Date();

    const personData = {
      fullName: data.fullName!,
      cpfEncrypted: this.encrypt(data.cpf!),
      cpfHash: this.hashSearch(data.cpf!),
      emailEncrypted: this.encrypt(data.email!.toLowerCase()),
      emailHash: this.hashSearch(data.email!.toLowerCase()),
      phoneEncrypted: this.encrypt(data.phone!),
      phoneHash: this.hashSearch(data.phone!),
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
    };

    const addressData = data.address
      ? {
          cep: data.address.cep!,
          street: data.address.street!,
          number: data.address.number,
          complement: data.address.complement,
          district: data.address.district!,
          city: data.address.city!,
          state: data.address.state!,
        }
      : undefined;

    const proposal = await this.prisma.proposal.create({
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

    await this.jobs.enqueueReceivedNotification({
      proposalId: proposal.id,
      protocol: proposal.protocol,
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

    const orphanLimit = new Date(
      Date.now() - DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
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

  private encrypt(value: string) {
    const key = this.getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  private getEncryptionKey() {
    const key = this.configService.get<string>('DATA_ENCRYPTION_KEY', {
      infer: true,
    });
    if (!key) {
      throw new Error('DATA_ENCRYPTION_KEY not set');
    }

    const buffer = Buffer.from(key, 'base64');
    if (buffer.length !== 32) {
      throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes (base64)');
    }

    return buffer;
  }
}
