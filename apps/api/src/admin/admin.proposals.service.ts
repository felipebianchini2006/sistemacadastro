import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ProposalStatus,
  ProposalType,
  RoleName,
  Prisma,
  SignatureStatus,
} from '@prisma/client';
import { createHash, createDecipheriv, randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SignatureService } from '../signature/signature.service';
import { JobsService } from '../jobs/jobs.service';
import {
  AssignProposalDto,
  ListProposalsQuery,
  RejectProposalDto,
  RequestChangesDto,
} from './admin.proposals.dto';

@Injectable()
export class AdminProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly signatureService: SignatureService,
    private readonly jobs: JobsService,
    private readonly configService: ConfigService,
  ) {}

  async list(query: ListProposalsQuery) {
    const where: Prisma.ProposalWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
        lte: query.dateTo ? new Date(query.dateTo) : undefined,
      };
    }

    if (query.text) {
      const term = query.text.trim();
      const digits = term.replace(/\D+/g, '');
      const personOr: Prisma.PersonWhereInput[] = [];
      if (term.length > 1) {
        personOr.push({
          fullName: { contains: term, mode: 'insensitive' },
        });
      }
      if (digits.length === 11) {
        personOr.push({ cpfHash: this.hashSearch(digits) });
      }
      if (personOr.length > 0) {
        where.person = { is: { OR: personOr } };
      }
    }

    this.applySlaFilter(where, query.sla);

    const proposals = await this.prisma.proposal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        person: true,
        assignedAnalyst: { select: { id: true, name: true, email: true } },
        statusHistory: {
          select: { toStatus: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      take: 100,
    });

    return proposals.map((proposal) => {
      const cpfMasked = proposal.person?.cpfEncrypted
        ? maskCpf(this.decrypt(proposal.person.cpfEncrypted))
        : null;

      return {
        id: proposal.id,
        protocol: proposal.protocol,
        status: proposal.status,
        type: proposal.type,
        createdAt: proposal.createdAt,
        statusHistory: proposal.statusHistory,
        sla: {
          startedAt: proposal.slaStartedAt,
          dueAt: proposal.slaDueAt,
          breachedAt: proposal.slaBreachedAt,
        },
        person: proposal.person
          ? {
              fullName: proposal.person.fullName,
              cpfMasked,
            }
          : null,
        assignedAnalyst: proposal.assignedAnalyst,
      };
    });
  }

  async getById(id: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        person: true,
        address: true,
        documents: true,
        ocrResults: { orderBy: { createdAt: 'desc' } },
        signatures: { orderBy: { createdAt: 'desc' } },
        notifications: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        auditLogs: { orderBy: { createdAt: 'desc' } },
        assignedAnalyst: { select: { id: true, name: true, email: true } },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    const cpfMasked = proposal.person?.cpfEncrypted
      ? maskCpf(this.decrypt(proposal.person.cpfEncrypted))
      : null;

    return {
      ...proposal,
      person: proposal.person
        ? {
            ...proposal.person,
            cpfMasked,
          }
        : null,
    };
  }

  async assign(
    proposalId: string,
    dto: AssignProposalDto,
    adminUserId: string,
  ) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    const analyst = await this.prisma.adminUser.findUnique({
      where: { id: dto.analystId },
      include: { roles: { include: { role: true } } },
    });

    if (!analyst) {
      throw new NotFoundException('Analista nao encontrado');
    }

    const roles = analyst.roles.map((entry) => entry.role.name);
    if (!roles.includes(RoleName.ANALYST)) {
      throw new BadRequestException('Usuario nao e analista');
    }

    await this.prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        assignedAnalystId: analyst.id,
        statusHistory: {
          create: {
            fromStatus: proposal.status,
            toStatus: proposal.status,
            reason: `Atribuido ao analista ${analyst.name}`,
          },
        },
      },
    });

    await this.createAuditLog(adminUserId, proposal.id, 'ASSIGN_ANALYST', {
      analystId: analyst.id,
    });

    return { ok: true };
  }

  async requestChanges(
    proposalId: string,
    dto: RequestChangesDto,
    adminUserId: string,
  ) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { person: true },
    });

    if (!proposal || !proposal.person) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    await this.prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: ProposalStatus.PENDING_DOCS,
        statusHistory: {
          create: {
            fromStatus: proposal.status,
            toStatus: ProposalStatus.PENDING_DOCS,
            reason: 'Pendencias solicitadas pelo analista',
          },
        },
      },
    });

    await this.createAuditLog(adminUserId, proposal.id, 'REQUEST_CHANGES', {
      missingItems: dto.missingItems,
      message: dto.message,
    });

    const email = this.decrypt(proposal.person.emailEncrypted);
    const phone = this.decrypt(proposal.person.phoneEncrypted);
    const link = this.buildTrackingLink(
      proposal.protocol,
      proposal.publicToken,
    );

    await this.notifications.notifyPending({
      proposalId: proposal.id,
      email,
      phone: phone || undefined,
      missingItems: dto.missingItems,
      secureLink: link,
      whatsappOptIn: true,
    });

    return { ok: true };
  }

  async approve(proposalId: string, adminUserId: string) {
    const result = await this.signatureService.requestSignature(proposalId);

    await this.createAuditLog(adminUserId, proposalId, 'APPROVE', {
      requestId: result.requestId,
    });

    return result;
  }

  async reject(
    proposalId: string,
    dto: RejectProposalDto,
    adminUserId: string,
  ) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { person: true },
    });

    if (!proposal || !proposal.person) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    await this.prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: ProposalStatus.REJECTED,
        rejectedAt: new Date(),
        statusHistory: {
          create: {
            fromStatus: proposal.status,
            toStatus: ProposalStatus.REJECTED,
            reason: dto.reason,
          },
        },
      },
    });

    await this.createAuditLog(adminUserId, proposal.id, 'REJECT', {
      reason: dto.reason,
    });

    const email = this.decrypt(proposal.person.emailEncrypted);
    await this.notifications.notifyRejected({
      proposalId: proposal.id,
      email,
      message: dto.reason,
    });

    return { ok: true };
  }

  async resendSignatureLink(proposalId: string, adminUserId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { person: true },
    });

    if (!proposal || !proposal.person) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    const latestEnvelope = await this.prisma.signatureEnvelope.findFirst({
      where: { proposalId: proposal.id },
      orderBy: { createdAt: 'desc' },
    });

    if (latestEnvelope) {
      await this.prisma.signatureEnvelope.update({
        where: { id: latestEnvelope.id },
        data: { status: SignatureStatus.CANCELED },
      });
    }

    const latestDoc = await this.prisma.documentFile.findFirst({
      where: {
        proposalId: proposal.id,
        contentType: 'application/pdf',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestDoc) {
      throw new BadRequestException('Contrato PDF nao encontrado');
    }

    const email = this.decrypt(proposal.person.emailEncrypted);
    const phone = this.decrypt(proposal.person.phoneEncrypted);

    await this.jobs.enqueueSignature({
      proposalId: proposal.id,
      documentFileId: latestDoc.id,
      protocol: proposal.protocol,
      candidate: {
        name: proposal.person.fullName,
        email,
        phone: phone || undefined,
      },
    });

    await this.prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        statusHistory: {
          create: {
            fromStatus: proposal.status,
            toStatus: proposal.status,
            reason: 'Link de assinatura reenviado',
          },
        },
      },
    });

    await this.createAuditLog(adminUserId, proposal.id, 'RESEND_SIGNATURE', {
      envelopeId: latestEnvelope?.id ?? null,
    });

    return { ok: true };
  }

  async exportPdf(proposalId: string, adminUserId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { person: true },
    });

    if (!proposal || !proposal.person) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    const email = this.decrypt(proposal.person.emailEncrypted);
    const phone = this.decrypt(proposal.person.phoneEncrypted);
    const requestId = randomUUID();

    await this.jobs.enqueuePdf({
      proposalId: proposal.id,
      protocol: proposal.protocol,
      candidate: {
        name: proposal.person.fullName,
        email,
        phone: phone || undefined,
      },
      requestId,
    });

    await this.createAuditLog(adminUserId, proposal.id, 'EXPORT_PDF', {
      requestId,
    });

    return { ok: true, requestId };
  }

  private applySlaFilter(where: Prisma.ProposalWhereInput, sla?: string) {
    if (!sla) return;

    const now = new Date();
    const dueSoonHours =
      this.configService.get<number>('SLA_DUE_SOON_HOURS', {
        infer: true,
      }) ?? 24;
    const soon = new Date(now.getTime() + dueSoonHours * 60 * 60 * 1000);

    if (sla === 'BREACHED') {
      where.OR = [{ slaBreachedAt: { not: null } }, { slaDueAt: { lt: now } }];
      return;
    }

    if (sla === 'DUE_SOON') {
      where.slaDueAt = { gte: now, lte: soon };
      where.slaBreachedAt = null;
      return;
    }

    if (sla === 'OK') {
      where.OR = [{ slaDueAt: { gt: soon } }, { slaDueAt: null }];
    }
  }

  private createAuditLog(
    adminUserId: string,
    proposalId: string,
    action: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        adminUserId,
        proposalId,
        action,
        entityType: 'Proposal',
        entityId: proposalId,
        metadata,
      },
    });
  }

  private buildTrackingLink(protocol: string, token: string) {
    const base = this.configService.get<string>('PUBLIC_TRACKING_BASE_URL', {
      infer: true,
    });

    if (!base) {
      return `Protocol ${protocol}`;
    }

    const url = new URL(base);
    url.searchParams.set('protocol', protocol);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private hashSearch(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private decrypt(value: string) {
    const key = this.getEncryptionKey();
    const buffer = Buffer.from(value, 'base64');
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
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

const maskCpf = (cpf: string) => {
  const digits = cpf.replace(/\D+/g, '');
  if (digits.length !== 11) return cpf;
  return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`;
};
