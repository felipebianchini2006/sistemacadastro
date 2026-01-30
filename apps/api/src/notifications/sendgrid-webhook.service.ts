import { Injectable } from '@nestjs/common';
import { EventWebhook } from '@sendgrid/eventwebhook';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationStatus } from '@prisma/client';

@Injectable()
export class SendgridWebhookService {
  private readonly verifier: EventWebhook;

  constructor(private readonly prisma: PrismaService) {
    this.verifier = new EventWebhook();
  }

  verifySignature(
    rawBody: Buffer,
    signature?: string,
    timestamp?: string,
    publicKey?: string,
  ) {
    if (!publicKey) {
      return true;
    }

    if (!signature || !timestamp) {
      return false;
    }

    return this.verifier.verifySignature(
      publicKey,
      rawBody,
      signature,
      timestamp,
    );
  }

  async handleEvents(events: Record<string, unknown>[]) {
    for (const event of events) {
      const eventType = (event.event as string | undefined) ?? '';
      const providerId =
        (event.sg_message_id as string | undefined) ??
        (event['smtp-id'] as string | undefined) ??
        (event.message_id as string | undefined);

      if (!providerId) continue;

      const status = mapSendgridEvent(eventType);
      if (!status) continue;

      await this.prisma.notification.updateMany({
        where: { providerMessageId: providerId },
        data: { status },
      });
    }
  }
}

const mapSendgridEvent = (event: string): NotificationStatus | null => {
  const normalized = event.toLowerCase();
  if (['delivered', 'open', 'click'].includes(normalized)) {
    return NotificationStatus.DELIVERED;
  }
  if (['bounce', 'dropped', 'blocked', 'spamreport'].includes(normalized)) {
    return NotificationStatus.FAILED;
  }
  return null;
};
