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
  NotificationChannel,
  TotvsSyncStatus,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SignatureService } from '../signature/signature.service';
import { JobsService } from '../jobs/jobs.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { StorageService } from '../storage/storage.service';
import { PublicSocialService } from '../public/public.social.service';
import {
  AssignProposalDto,
  BulkAssignProposalDto,
  BulkStatusProposalDto,
  ListProposalsQuery,
  UpdateProposalDto,
  AddNoteDto,
  SendMessageDto,
  RejectProposalDto,
  RequestChangesDto,
  UpdateOcrDto,
} from './admin.proposals.dto';
import {
  normalizePhone,
  normalizePhoneToE164,
} from '@sistemacadastro/shared/dist/validators/phone.js';
import { normalizeCpf as normalizeCpfValue } from '@sistemacadastro/shared/dist/validators/cpf.js';
import { normalizeEmail as normalizeEmailValue } from '@sistemacadastro/shared/dist/validators/email.js';

@Injectable()
export class AdminProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly signatureService: SignatureService,
    private readonly jobs: JobsService,
    private readonly configService: ConfigService,
    private readonly crypto: CryptoService,
    private readonly storage: StorageService,
    private readonly socialService: PublicSocialService,
  ) {}

  async list(query: ListProposalsQuery) {
    const where: Prisma.ProposalWhereInput = {};

    if (query.status) {
      const statuses = Array.isArray(query.status)
        ? query.status
        : [query.status];
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
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

    if (query.profileRoles && query.profileRoles.length > 0) {
      where.AND = [
        ...(Array.isArray(where.AND)
          ? where.AND
          : where.AND
            ? [where.AND]
            : []),
        {
          OR: query.profileRoles.map((role) => ({
            profileRoles: { array_contains: [role] },
          })),
        },
      ];
    }

    this.applySlaFilter(where, query.sla);

    const dir = query.sortDir ?? 'desc';
    let orderBy: Prisma.ProposalOrderByWithRelationInput = { createdAt: dir };
    if (query.sortBy === 'protocol') orderBy = { protocol: dir };
    else if (query.sortBy === 'status') orderBy = { status: dir };
    else if (query.sortBy === 'type') orderBy = { type: dir };
    else if (query.sortBy === 'fullName')
      orderBy = { person: { fullName: dir } };

    const usePagination =
      query.page !== undefined || query.pageSize !== undefined;
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 200);

    const baseQuery = {
      where,
      orderBy,
      include: {
        person: true,
        assignedAnalyst: { select: { id: true, name: true, email: true } },
        statusHistory: {
          select: { toStatus: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    } satisfies Prisma.ProposalFindManyArgs;

    const [total, proposals] = usePagination
      ? await this.prisma.$transaction([
          this.prisma.proposal.count({ where }),
          this.prisma.proposal.findMany({
            ...baseQuery,
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
        ])
      : [
          undefined,
          await this.prisma.proposal.findMany({
            ...baseQuery,
            take: 100,
          }),
        ];

    const items = await Promise.all(
      proposals.map(async (proposal) => {
        const cpfMasked = proposal.person?.cpfEncrypted
          ? maskCpf(await this.crypto.decrypt(proposal.person.cpfEncrypted))
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
      }),
    );

    if (usePagination) {
      return {
        items,
        total: total ?? items.length,
        page,
        pageSize,
      };
    }

    return items;
  }

  async getDocumentViewUrl(proposalId: string, documentId: string) {
    const doc = await this.prisma.documentFile.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.proposalId !== proposalId) {
      throw new NotFoundException('Documento nao encontrado');
    }

    const result = await this.storage.presignGetObject(doc.storageKey, 600);
    return { url: result.url, contentType: doc.contentType };
  }

  async getById(
    id: string,
    adminUserId?: string,
    context: { ip?: string; userAgent?: string } = {},
  ) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        person: {
          include: {
            socialAccounts: true,
            bankAccounts: true,
          },
        },
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

    if (adminUserId) {
      await this.prisma.auditLog.create({
        data: {
          adminUserId,
          proposalId: proposal.id,
          action: 'VIEW_DOSSIER',
          entityType: 'Proposal',
          entityId: proposal.id,
          ip: context.ip,
          userAgent: context.userAgent,
        },
      });
    }

    const cpfMasked = proposal.person?.cpfEncrypted
      ? maskCpf(await this.crypto.decrypt(proposal.person.cpfEncrypted))
      : null;

    const socialAccounts = await Promise.all(
      (proposal.person?.socialAccounts ?? []).map(async (account) => {
        let profile = extractProfile(account.tokenMeta);
        try {
          const refreshed = await this.socialService.refreshProfileIfStale(
            account.id,
          );
          if (refreshed) profile = refreshed;
        } catch {
          // keep cached profile on error
        }
        return {
          provider: account.provider,
          connectedAt: account.createdAt,
          profile,
        };
      }),
    );

    const bankAccounts = proposal.person?.bankAccounts
      ? await Promise.all(
          proposal.person.bankAccounts.map(async (account) => {
            const accountValue = account.accountEncrypted
              ? await this.crypto.decrypt(account.accountEncrypted)
              : null;
            const agencyValue = account.agencyEncrypted
              ? await this.crypto.decrypt(account.agencyEncrypted)
              : null;
            const holderDoc = account.holderDocumentEncrypted
              ? await this.crypto.decrypt(account.holderDocumentEncrypted)
              : null;
            const pixKey = account.pixKeyEncrypted
              ? await this.crypto.decrypt(account.pixKeyEncrypted)
              : null;

            return {
              id: account.id,
              bankCode: account.bankCode,
              bankName: account.bankName,
              accountType: account.accountType,
              verificationStatus: account.verificationStatus,
              accountMasked: maskDigits(accountValue),
              agencyMasked: maskDigits(agencyValue, 2),
              holderName: account.holderName,
              holderDocumentMasked: maskDigits(holderDoc),
              pixKeyMasked: maskContact(pixKey),
              pixKeyType: account.pixKeyType,
              createdAt: account.createdAt,
            };
          }),
        )
      : [];

    const person = proposal.person
      ? stripNestedAccounts({ ...proposal.person, cpfMasked })
      : null;

    return {
      ...proposal,
      person,
      socialAccounts,
      bankAccounts,
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

  async bulkAssign(dto: BulkAssignProposalDto, adminUserId: string) {
    const proposals = await this.prisma.proposal.findMany({
      where: { id: { in: dto.proposalIds } },
      select: { id: true, status: true },
    });

    if (proposals.length === 0) {
      throw new NotFoundException('Propostas nao encontradas');
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

    await this.prisma.$transaction(async (tx) => {
      for (const proposal of proposals) {
        await tx.proposal.update({
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

        await tx.auditLog.create({
          data: {
            adminUserId,
            proposalId: proposal.id,
            action: 'ASSIGN_ANALYST_BULK',
            entityType: 'Proposal',
            entityId: proposal.id,
            metadata: { analystId: analyst.id, bulk: true },
          },
        });
      }
    });

    return { ok: true, count: proposals.length };
  }

  async bulkStatus(dto: BulkStatusProposalDto, adminUserId: string) {
    const allowedStatuses = new Set<ProposalStatus>([
      ProposalStatus.UNDER_REVIEW,
      ProposalStatus.PENDING_DOCS,
      ProposalStatus.REJECTED,
      ProposalStatus.CANCELED,
    ]);

    if (!allowedStatuses.has(dto.status)) {
      throw new BadRequestException('Status nao permitido para acao em lote');
    }

    const proposals = await this.prisma.proposal.findMany({
      where: { id: { in: dto.proposalIds } },
      include: { person: true },
    });

    if (proposals.length === 0) {
      throw new NotFoundException('Propostas nao encontradas');
    }

    const now = new Date();
    const reason =
      dto.reason?.trim() ||
      (dto.status === ProposalStatus.PENDING_DOCS
        ? 'Pendencias solicitadas pelo analista'
        : 'Atualizacao em lote');

    await this.prisma.$transaction(async (tx) => {
      for (const proposal of proposals) {
        const update: Prisma.ProposalUpdateInput = {
          status: dto.status,
          statusHistory: {
            create: {
              fromStatus: proposal.status,
              toStatus: dto.status,
              reason,
            },
          },
        };

        if (dto.status === ProposalStatus.REJECTED) {
          update.rejectedAt = now;
        }

        await tx.proposal.update({
          where: { id: proposal.id },
          data: update,
        });

        await tx.auditLog.create({
          data: {
            adminUserId,
            proposalId: proposal.id,
            action: 'STATUS_BULK',
            entityType: 'Proposal',
            entityId: proposal.id,
            metadata: {
              fromStatus: proposal.status,
              toStatus: dto.status,
              reason,
              bulk: true,
            },
          },
        });
      }
    });

    if (dto.status === ProposalStatus.PENDING_DOCS) {
      const missingItems = dto.missingItems ?? [];
      await Promise.all(
        proposals
          .filter((proposal) => proposal.person)
          .map(async (proposal) => {
            const email = await this.crypto.decrypt(
              proposal.person!.emailEncrypted,
            );
            const phone = await this.crypto.decrypt(
              proposal.person!.phoneEncrypted,
            );
            const link = this.buildTrackingLink(
              proposal.protocol,
              proposal.publicToken,
            );
            await this.notifications.notifyPending({
              proposalId: proposal.id,
              email,
              phone: phone || undefined,
              missingItems,
              secureLink: link,
              whatsappOptIn: true,
            });
          }),
      );
    }

    if (dto.status === ProposalStatus.REJECTED) {
      const message = dto.reason?.trim() ?? 'Proposta reprovada.';
      await Promise.all(
        proposals
          .filter((proposal) => proposal.person)
          .map(async (proposal) => {
            const email = await this.crypto.decrypt(
              proposal.person!.emailEncrypted,
            );
            const phone = await this.crypto.decrypt(
              proposal.person!.phoneEncrypted,
            );
            await this.notifications.notifyRejected({
              proposalId: proposal.id,
              email,
              phone: phone || undefined,
              message,
            });
          }),
      );
    }

    return { ok: true, count: proposals.length };
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

    const email = await this.crypto.decrypt(proposal.person.emailEncrypted);
    const phone = await this.crypto.decrypt(proposal.person.phoneEncrypted);
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

  async updateProposal(
    proposalId: string,
    dto: UpdateProposalDto,
    adminUserId: string,
  ) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { person: true, address: true },
    });
    if (!proposal || !proposal.person) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    const changes: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      if (dto.profileRoles) {
        changes.push('profileRoles');
        await tx.proposal.update({
          where: { id: proposal.id },
          data: { profileRoles: dto.profileRoles as Prisma.InputJsonValue },
        });
      }
      if (dto.profileRoleOther !== undefined) {
        changes.push('profileRoleOther');
        await tx.proposal.update({
          where: { id: proposal.id },
          data: { profileRoleOther: dto.profileRoleOther },
        });
      }

      if (dto.person) {
        const personUpdates: Prisma.PersonUpdateInput = {};
        if (dto.person.fullName) {
          personUpdates.fullName = dto.person.fullName;
          changes.push('person.fullName');
        }
        if (dto.person.cpf) {
          const cpf = normalizeCpfValue(dto.person.cpf);
          personUpdates.cpfEncrypted = await this.crypto.encrypt(cpf);
          personUpdates.cpfHash = this.hashSearch(cpf);
          changes.push('person.cpf');
        }
        if (dto.person.email) {
          const email = normalizeEmailValue(dto.person.email);
          personUpdates.emailEncrypted = await this.crypto.encrypt(email);
          personUpdates.emailHash = this.hashSearch(email);
          changes.push('person.email');
        }
        if (dto.person.phone) {
          const phone = normalizePhoneToE164(dto.person.phone);
          const phoneValue = phone.e164 ?? normalizePhone(dto.person.phone);
          personUpdates.phoneEncrypted = await this.crypto.encrypt(phoneValue);
          personUpdates.phoneHash = this.hashSearch(phoneValue);
          changes.push('person.phone');
        }
        if (dto.person.birthDate) {
          const birth = new Date(dto.person.birthDate);
          if (!Number.isNaN(birth.getTime())) {
            personUpdates.birthDate = birth;
            changes.push('person.birthDate');
          }
        }

        if (Object.keys(personUpdates).length > 0) {
          await tx.person.update({
            where: { proposalId: proposal.id },
            data: personUpdates,
          });
        }
      }

      if (dto.address) {
        if (
          !proposal.address &&
          (!dto.address.cep ||
            !dto.address.street ||
            !dto.address.district ||
            !dto.address.city ||
            !dto.address.state)
        ) {
          throw new BadRequestException('Endereco incompleto');
        }

        const addressData: Prisma.AddressUpdateInput = {
          cep: dto.address.cep,
          street: dto.address.street,
          number: dto.address.number,
          complement: dto.address.complement,
          district: dto.address.district,
          city: dto.address.city,
          state: dto.address.state,
        };

        if (proposal.address) {
          await tx.address.update({
            where: { proposalId: proposal.id },
            data: addressData,
          });
        } else {
          await tx.address.create({
            data: {
              proposalId: proposal.id,
              cep: dto.address.cep ?? '',
              street: dto.address.street ?? '',
              number: dto.address.number,
              complement: dto.address.complement,
              district: dto.address.district ?? '',
              city: dto.address.city ?? '',
              state: dto.address.state ?? '',
            },
          });
        }
        changes.push('address');
      }
    });

    await this.createAuditLog(adminUserId, proposal.id, 'UPDATE_PROPOSAL', {
      changes,
    });

    return { ok: true };
  }

  async updateOcr(proposalId: string, dto: UpdateOcrDto, adminUserId: string) {
    const ocr = await this.prisma.ocrResult.findFirst({
      where: { proposalId },
      orderBy: { createdAt: 'desc' },
    });

    if (!ocr) {
      throw new NotFoundException('OCR nao encontrado');
    }

    const structured =
      (ocr.structuredData as Record<string, unknown> | null) ?? {};
    const currentFields =
      structured.fields && typeof structured.fields === 'object'
        ? (structured.fields as Record<string, unknown>)
        : {};

    const updates: Record<string, string> = {};
    if (dto.fields) {
      for (const [key, value] of Object.entries(dto.fields)) {
        if (typeof value !== 'string') continue;
        const trimmed = value.trim();
        if (!trimmed) continue;
        updates[key] = trimmed;
      }
    }

    const next: Record<string, unknown> = { ...structured };
    if (Object.keys(updates).length > 0) {
      next.fields = { ...currentFields, ...updates };
    }
    if (dto.documentType && dto.documentType.trim()) {
      next.document_type = dto.documentType.trim();
    }

    await this.prisma.ocrResult.update({
      where: { id: ocr.id },
      data: { structuredData: next as Prisma.InputJsonValue },
    });

    await this.createAuditLog(adminUserId, proposalId, 'OCR_UPDATE', {
      ocrId: ocr.id,
      fields: Object.keys(updates),
      documentType: dto.documentType?.trim() || null,
    });

    return { ok: true };
  }

  async addNote(proposalId: string, dto: AddNoteDto, adminUserId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { id: true },
    });
    if (!proposal) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    await this.createAuditLog(adminUserId, proposal.id, 'NOTE', {
      note: dto.note,
    });

    return { ok: true };
  }

  async sendMessage(
    proposalId: string,
    dto: SendMessageDto,
    adminUserId: string,
  ) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { person: true },
    });

    if (!proposal || !proposal.person) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    const email = await this.crypto.decrypt(proposal.person.emailEncrypted);
    const phone = await this.crypto.decrypt(proposal.person.phoneEncrypted);
    const channel =
      dto.channel === 'EMAIL'
        ? NotificationChannel.EMAIL
        : dto.channel === 'SMS'
          ? NotificationChannel.SMS
          : NotificationChannel.WHATSAPP;

    const target =
      channel === NotificationChannel.EMAIL ? email : phone || undefined;
    if (!target) {
      throw new BadRequestException('Contato do candidato nao encontrado');
    }

    await this.notifications.notifyAdminMessage({
      proposalId: proposal.id,
      to: target,
      channel,
      message: dto.message,
      subject: dto.subject,
      whatsappOptIn: true,
    });

    await this.createAuditLog(adminUserId, proposal.id, 'ADMIN_MESSAGE', {
      channel: dto.channel,
    });

    return { ok: true };
  }

  async startReview(proposalId: string, adminUserId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { id: true, status: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    const allowed = new Set<ProposalStatus>([
      ProposalStatus.SUBMITTED,
      ProposalStatus.PENDING_DOCS,
    ]);

    if (!allowed.has(proposal.status)) {
      throw new BadRequestException('Status da proposta invalido');
    }

    await this.prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: ProposalStatus.UNDER_REVIEW,
        statusHistory: {
          create: {
            fromStatus: proposal.status,
            toStatus: ProposalStatus.UNDER_REVIEW,
            reason: 'Analise iniciada',
          },
        },
      },
    });

    await this.createAuditLog(adminUserId, proposal.id, 'REVIEW_START');

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

    const email = await this.crypto.decrypt(proposal.person.emailEncrypted);
    const phone = await this.crypto.decrypt(proposal.person.phoneEncrypted);
    await this.notifications.notifyRejected({
      proposalId: proposal.id,
      email,
      phone: phone || undefined,
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
      await this.jobs.enqueueSignatureCancel({
        proposalId: proposal.id,
        envelopeId: latestEnvelope.envelopeId,
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

    const email = await this.crypto.decrypt(proposal.person.emailEncrypted);
    const phone = await this.crypto.decrypt(proposal.person.phoneEncrypted);

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

    const requestId = randomUUID();

    await this.jobs.enqueueDossierPdf({
      proposalId: proposal.id,
      protocol: proposal.protocol,
      requestId,
    });

    await this.createAuditLog(adminUserId, proposal.id, 'EXPORT_PDF', {
      requestId,
    });

    return { ok: true, requestId };
  }

  async reprocessTotvs(proposalId: string, adminUserId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { id: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    await this.prisma.totvsSync.upsert({
      where: { proposalId: proposal.id },
      create: {
        proposalId: proposal.id,
        status: TotvsSyncStatus.PENDING,
        map: { requestedBy: adminUserId },
      },
      update: {
        status: TotvsSyncStatus.PENDING,
        map: { requestedBy: adminUserId },
      },
    });

    await this.jobs.enqueueTotvsSync({ proposalId: proposal.id });

    await this.createAuditLog(adminUserId, proposal.id, 'TOTVS_REPROCESS');

    return { ok: true };
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
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
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
}

const maskCpf = (cpf: string) => {
  const digits = cpf.replace(/\D+/g, '');
  if (digits.length !== 11) return cpf;
  return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const maskDigits = (value: string | null | undefined, keep = 4) => {
  if (!value) return null;
  const digits = value.replace(/\D+/g, '');
  if (!digits) return null;
  if (digits.length <= keep) return `***${digits}`;
  return `***${digits.slice(-keep)}`;
};

const maskContact = (value: string | null | undefined) => {
  if (!value) return null;
  if (value.includes('@')) {
    const [user, domain] = value.split('@');
    if (!domain) return '***';
    return `${user?.slice(0, 2) ?? '**'}***@${domain}`;
  }
  const digitsMasked = maskDigits(value);
  if (digitsMasked) return digitsMasked;
  if (value.length <= 4) return '***';
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};

const stripNestedAccounts = (person: Record<string, unknown>) => {
  const { socialAccounts, bankAccounts, ...rest } = person;
  return rest;
};

const extractProfile = (tokenMeta: unknown) => {
  if (!tokenMeta || typeof tokenMeta !== 'object') return null;
  const profile = (tokenMeta as Record<string, unknown>).profile;
  if (!profile || typeof profile !== 'object') return null;
  return profile;
};
