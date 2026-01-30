import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationStatus } from '@prisma/client';

@Injectable()
export class TwilioWebhookService {
  constructor(private readonly prisma: PrismaService) {}

  async handleStatusCallback(body: Record<string, string>) {
    const messageSid = body.MessageSid;
    const status = body.MessageStatus;

    if (!messageSid || !status) {
      return { ok: true };
    }

    const mapped = mapTwilioStatus(status);
    if (!mapped) {
      return { ok: true };
    }

    await this.prisma.notification.updateMany({
      where: { providerMessageId: messageSid },
      data: { status: mapped },
    });

    return { ok: true };
  }
}

const mapTwilioStatus = (status: string): NotificationStatus | null => {
  const normalized = status.toLowerCase();
  if (['delivered', 'read'].includes(normalized)) {
    return NotificationStatus.DELIVERED;
  }
  if (['failed', 'undelivered'].includes(normalized)) {
    return NotificationStatus.FAILED;
  }
  return null;
};
