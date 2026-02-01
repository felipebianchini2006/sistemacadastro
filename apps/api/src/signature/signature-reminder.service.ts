import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { SignatureStatus } from '@prisma/client';

@Injectable()
export class SignatureReminderService {
  private readonly logger = new Logger(SignatureReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly crypto: CryptoService,
  ) {}

  @Cron('0 9 * * *')
  async runDaily() {
    const now = new Date();
    const envelopes = await this.prisma.signatureEnvelope.findMany({
      where: {
        status: SignatureStatus.SENT,
        proposal: {
          status: 'PENDING_SIGNATURE',
        },
      },
      include: {
        proposal: {
          include: {
            person: true,
          },
        },
      },
    });

    for (const envelope of envelopes) {
      if (!envelope.proposal?.person) continue;
      const createdAt = envelope.createdAt;
      const days = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (days !== 3 && days !== 6) continue;

      const template =
        days === 3 ? 'signature_reminder_3' : 'signature_reminder_6';
      const alreadySent = await this.prisma.notification.findFirst({
        where: {
          proposalId: envelope.proposalId,
          payloadRedacted: {
            path: ['template'],
            equals: template,
          },
        },
        select: { id: true },
      });
      if (alreadySent) continue;

      const email = await this.crypto.decrypt(
        envelope.proposal.person.emailEncrypted,
      );
      const phone = await this.crypto.decrypt(
        envelope.proposal.person.phoneEncrypted,
      );

      await this.notifications.notifySignatureReminder({
        proposalId: envelope.proposalId,
        email,
        phone: phone || undefined,
        signatureLink: envelope.link ?? '',
        step: days === 3 ? 3 : 6,
        whatsappOptIn: true,
      });
    }

    this.logger.debug(`Signature reminders checked: ${envelopes.length}`);
  }
}
