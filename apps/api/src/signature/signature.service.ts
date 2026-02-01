import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProposalStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { CryptoService } from '../common/crypto/crypto.service';

@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly crypto: CryptoService,
  ) {}

  async requestSignature(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { person: true },
    });

    if (!proposal || !proposal.person) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    const allowedStatuses = new Set<ProposalStatus>([
      ProposalStatus.SUBMITTED,
      ProposalStatus.UNDER_REVIEW,
    ]);

    if (!allowedStatuses.has(proposal.status)) {
      throw new BadRequestException('Status da proposta invalido');
    }

    const email = await this.crypto.decrypt(proposal.person.emailEncrypted);
    const phone = await this.crypto.decrypt(proposal.person.phoneEncrypted);

    const candidate = {
      name: proposal.person.fullName,
      email,
      phone: phone || undefined,
    };

    const requestId = randomUUID();

    await this.jobs.enqueuePdf({
      proposalId: proposal.id,
      protocol: proposal.protocol,
      candidate,
      requestId,
    });

    await this.prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: ProposalStatus.PENDING_SIGNATURE,
        statusHistory: {
          create: {
            fromStatus: proposal.status,
            toStatus: ProposalStatus.PENDING_SIGNATURE,
            reason: 'Assinatura solicitada',
          },
        },
      },
    });

    this.logger.log({ proposalId, requestId }, 'signature.requested');

    return { ok: true, requestId };
  }
}
