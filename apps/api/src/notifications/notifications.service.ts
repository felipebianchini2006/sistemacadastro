import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import {
  NotificationTemplateKey,
  NotificationTemplateData,
} from './notification.types';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  async queueEmail(input: {
    proposalId: string;
    to: string;
    template: NotificationTemplateKey;
    data: Record<string, unknown>;
  }) {
    return this.enqueue({
      channel: NotificationChannel.EMAIL,
      proposalId: input.proposalId,
      to: input.to,
      template: input.template,
      data: input.data,
    });
  }

  async queueSms(input: {
    proposalId: string;
    to: string;
    template: NotificationTemplateKey;
    data: Record<string, unknown>;
  }) {
    return this.enqueue({
      channel: NotificationChannel.SMS,
      proposalId: input.proposalId,
      to: input.to,
      template: input.template,
      data: input.data,
    });
  }

  async queueWhatsapp(input: {
    proposalId: string;
    to: string;
    template: NotificationTemplateKey;
    data: Record<string, unknown>;
    optIn?: boolean;
  }) {
    return this.enqueue({
      channel: NotificationChannel.WHATSAPP,
      proposalId: input.proposalId,
      to: input.to,
      template: input.template,
      data: input.data,
      optIn: input.optIn,
    });
  }

  async notifyProposalReceived(input: {
    proposalId: string;
    email: string;
    phone?: string;
    protocol: string;
    deadlineDays: number;
    whatsappOptIn?: boolean;
  }) {
    const payload: NotificationTemplateData = {
      template: 'proposal_received',
      protocol: input.protocol,
      deadlineDays: input.deadlineDays,
    };

    await this.queueEmail({
      proposalId: input.proposalId,
      to: input.email,
      template: payload.template,
      data: payload,
    });

    if (input.phone) {
      await this.queueWhatsapp({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
        optIn: input.whatsappOptIn ?? true,
      });
    }
  }

  async notifyPending(input: {
    proposalId: string;
    email: string;
    phone?: string;
    missingItems: string[];
    secureLink: string;
    whatsappOptIn?: boolean;
  }) {
    const payload: NotificationTemplateData = {
      template: 'proposal_pending',
      missingItems: input.missingItems,
      secureLink: input.secureLink,
    };

    await this.queueEmail({
      proposalId: input.proposalId,
      to: input.email,
      template: payload.template,
      data: payload,
    });
    if (input.phone) {
      await this.queueWhatsapp({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
        optIn: input.whatsappOptIn ?? true,
      });
    }
  }

  async notifyApproved(input: {
    proposalId: string;
    email: string;
    phone?: string;
    signatureLink: string;
    whatsappOptIn?: boolean;
  }) {
    const payload: NotificationTemplateData = {
      template: 'proposal_approved',
      signatureLink: input.signatureLink,
    };

    await this.queueEmail({
      proposalId: input.proposalId,
      to: input.email,
      template: payload.template,
      data: payload,
    });
    if (input.phone) {
      await this.queueWhatsapp({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
        optIn: input.whatsappOptIn ?? true,
      });
    }
  }

  async notifyRejected(input: {
    proposalId: string;
    email: string;
    message: string;
  }) {
    const payload: NotificationTemplateData = {
      template: 'proposal_rejected',
      message: input.message,
    };

    await this.queueEmail({
      proposalId: input.proposalId,
      to: input.email,
      template: payload.template,
      data: payload,
    });
  }

  async notifySigned(input: {
    proposalId: string;
    email: string;
    phone?: string;
    memberNumber: string;
    whatsappOptIn?: boolean;
  }) {
    const payload: NotificationTemplateData = {
      template: 'proposal_signed',
      memberNumber: input.memberNumber,
    };

    await this.queueEmail({
      proposalId: input.proposalId,
      to: input.email,
      template: payload.template,
      data: payload,
    });
    if (input.phone) {
      await this.queueWhatsapp({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
        optIn: input.whatsappOptIn ?? true,
      });
    }
  }

  private async enqueue(input: {
    channel: NotificationChannel;
    proposalId: string;
    to: string;
    template: NotificationTemplateKey;
    data: Record<string, unknown>;
    optIn?: boolean;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        proposalId: input.proposalId,
        channel: input.channel,
        status: NotificationStatus.PENDING,
        payloadRedacted: {
          to: input.to,
          template: input.template,
          data: input.data,
          optIn: input.optIn ?? null,
        },
      },
    });

    const requestId = randomUUID();

    if (input.channel === NotificationChannel.EMAIL) {
      await this.jobs.enqueueEmailNotification({
        notificationId: notification.id,
        to: input.to,
        template: input.template,
        data: input.data,
        requestId,
      });
    }

    if (input.channel === NotificationChannel.SMS) {
      await this.jobs.enqueueSmsNotification({
        notificationId: notification.id,
        to: input.to,
        template: input.template,
        data: input.data,
        requestId,
      });
    }

    if (input.channel === NotificationChannel.WHATSAPP) {
      await this.jobs.enqueueWhatsappNotification({
        notificationId: notification.id,
        to: input.to,
        template: input.template,
        data: input.data,
        requestId,
        optIn: input.optIn,
      });
    }

    return notification;
  }
}
