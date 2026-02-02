import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProposalStatus } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class TotvsWebhookService {
  constructor(private readonly prisma: PrismaService) {}

  async handle(payload: Record<string, unknown>) {
    const externalId = extractExternalId(payload);
    const status = extractStatus(payload);
    const cpf = extractCpf(payload);

    const proposalId = await this.resolveProposalId(externalId, cpf);
    if (!proposalId) {
      return { ok: true };
    }

    // Atualiza TotvsSync com externalId (conciliacao bidirecional)
    if (externalId && proposalId) {
      await this.prisma.totvsSync.upsert({
        where: { proposalId },
        create: {
          proposalId,
          externalId,
          status: 'SYNCED' as any,
          lastSyncAt: new Date(),
          map: payload as any,
        },
        update: {
          externalId,
          lastSyncAt: new Date(),
          map: payload as any,
        },
      });
    }

    if (status) {
      const mapped = mapTotvsStatus(status);
      if (mapped) {
        await this.prisma.proposal.update({
          where: { id: proposalId },
          data: {
            status: mapped,
            statusHistory: {
              create: {
                fromStatus: null,
                toStatus: mapped,
                reason: `Totvs: ${status}`,
              },
            },
          },
        });
      }
    }

    return { ok: true };
  }

  private async resolveProposalId(externalId?: string, cpf?: string) {
    if (externalId) {
      const sync = await this.prisma.totvsSync.findFirst({
        where: { externalId },
        select: { proposalId: true },
      });
      if (sync?.proposalId) return sync.proposalId;
    }

    if (cpf) {
      const cpfHash = createHash('sha256')
        .update(cpf.replace(/\D+/g, ''))
        .digest('hex');
      const person = await this.prisma.person.findFirst({
        where: { cpfHash },
        select: { proposalId: true },
      });
      return person?.proposalId ?? null;
    }

    return null;
  }
}

const extractExternalId = (payload: Record<string, unknown>) => {
  const direct = payload.externalId ?? payload.external_id ?? payload.id;
  if (direct) return String(direct);
  const data = payload.data as Record<string, unknown> | undefined;
  if (data?.id) return String(data.id);
  return undefined;
};

const extractStatus = (payload: Record<string, unknown>) => {
  const status = payload.status ?? payload.situacao ?? payload.state;
  if (status) return String(status);
  const data = payload.data as Record<string, unknown> | undefined;
  if (data?.status) return String(data.status);
  return undefined;
};

const extractCpf = (payload: Record<string, unknown>) => {
  const cpf = payload.cpf ?? payload.documento ?? payload.document;
  if (cpf) return String(cpf);
  const data = payload.data as Record<string, unknown> | undefined;
  if (data?.cpf) return String(data.cpf);
  return undefined;
};

const mapTotvsStatus = (status: string) => {
  const normalized = status.trim().toLowerCase();
  if (['ativo', 'active', 'aprovado'].includes(normalized)) {
    return ProposalStatus.APPROVED;
  }
  if (['suspenso', 'suspended', 'cancelado', 'canceled'].includes(normalized)) {
    return ProposalStatus.CANCELED;
  }
  return null;
};
