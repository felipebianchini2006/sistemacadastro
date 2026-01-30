import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProposalStatus } from '@prisma/client';
import { createDecipheriv, randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly configService: ConfigService,
  ) {}

  async requestSignature(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { person: true },
    });

    if (!proposal || !proposal.person) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    if (
      ![ProposalStatus.SUBMITTED, ProposalStatus.UNDER_REVIEW].includes(
        proposal.status,
      )
    ) {
      throw new BadRequestException('Status da proposta invalido');
    }

    const email = this.decrypt(proposal.person.emailEncrypted);
    const phone = this.decrypt(proposal.person.phoneEncrypted);

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
