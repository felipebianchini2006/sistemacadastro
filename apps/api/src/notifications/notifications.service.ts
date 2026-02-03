import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { AdminPushService } from '../admin/admin.push.service';
import {
  NotificationTemplateKey,
  NotificationTemplateData,
} from './notification.types';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    @Inject(forwardRef(() => AdminPushService))
    private readonly push: AdminPushService,
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
      await this.queueSms({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
      });
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
      await this.queueSms({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
      });
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
      await this.queueSms({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
      });
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
    phone?: string;
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

    if (input.phone) {
      await this.queueSms({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
      });
    }
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
      await this.queueSms({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
      });
      await this.queueWhatsapp({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
        optIn: input.whatsappOptIn ?? true,
      });
    }
  }

  async notifyConcluded(input: {
    proposalId: string;
    email: string;
    phone?: string;
    memberNumber: string;
    whatsappOptIn?: boolean;
  }) {
    const payload: NotificationTemplateData = {
      template: 'proposal_concluded',
      memberNumber: input.memberNumber,
    };

    await this.queueEmail({
      proposalId: input.proposalId,
      to: input.email,
      template: payload.template,
      data: payload,
    });

    if (input.phone) {
      await this.queueSms({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
      });
      await this.queueWhatsapp({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
        optIn: input.whatsappOptIn ?? true,
      });
    }
  }

  async notifySignatureReminder(input: {
    proposalId: string;
    email: string;
    phone?: string;
    signatureLink: string;
    step: 3 | 6;
    whatsappOptIn?: boolean;
  }) {
    const template =
      input.step === 3 ? 'signature_reminder_3' : 'signature_reminder_6';
    const payload: NotificationTemplateData = {
      template,
      signatureLink: input.signatureLink,
    };

    await this.queueEmail({
      proposalId: input.proposalId,
      to: input.email,
      template: payload.template,
      data: payload,
    });

    if (input.phone) {
      await this.queueSms({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
      });

      await this.queueWhatsapp({
        proposalId: input.proposalId,
        to: input.phone,
        template: payload.template,
        data: payload,
        optIn: input.whatsappOptIn ?? true,
      });
    }
  }

  async notifyInternalNewProposal(input: {
    proposalId: string;
    protocol: string;
    name: string;
  }) {
    const emails = this.getTeamEmails();
    if (emails.length === 0) return;

    const payload: NotificationTemplateData = {
      template: 'internal_new_proposal',
      protocol: input.protocol,
      name: input.name,
    };

    await Promise.all(
      emails.map((email) =>
        this.queueEmail({
          proposalId: input.proposalId,
          to: email,
          template: payload.template,
          data: payload,
        }),
      ),
    );

    // Send push notification to admin team
    await this.push.sendPushToTeam({
      proposalId: input.proposalId,
      title: 'Nova proposta recebida',
      body: `${input.name} (${input.protocol})`,
      url: `/admin/propostas/${input.proposalId}`,
    });
  }

  async notifyInternalDocsReceived(input: {
    proposalId: string;
    protocol: string;
    name: string;
  }) {
    const emails = this.getTeamEmails();
    if (emails.length === 0) return;

    const payload: NotificationTemplateData = {
      template: 'internal_docs_received',
      protocol: input.protocol,
      name: input.name,
    };

    await Promise.all(
      emails.map((email) =>
        this.queueEmail({
          proposalId: input.proposalId,
          to: email,
          template: payload.template,
          data: payload,
        }),
      ),
    );
  }

  async notifyInternalCandidateSigned(input: {
    proposalId: string;
    protocol: string;
    name: string;
  }) {
    const emails = this.getTeamEmails();
    if (emails.length === 0) return;

    const payload: NotificationTemplateData = {
      template: 'internal_candidate_signed',
      protocol: input.protocol,
      name: input.name,
    };

    await Promise.all(
      emails.map((email) =>
        this.queueEmail({
          proposalId: input.proposalId,
          to: email,
          template: payload.template,
          data: payload,
        }),
      ),
    );
  }

  async notifyInternalSlaDue(input: {
    proposalId: string;
    protocol: string;
    name: string;
  }) {
    const emails = this.getTeamEmails();
    if (emails.length === 0) return;

    const payload: NotificationTemplateData = {
      template: 'internal_sla_due',
      protocol: input.protocol,
      name: input.name,
    };

    await Promise.all(
      emails.map((email) =>
        this.queueEmail({
          proposalId: input.proposalId,
          to: email,
          template: payload.template,
          data: payload,
        }),
      ),
    );
  }

  async notifyAdminMessage(input: {
    proposalId: string;
    to: string;
    channel: NotificationChannel;
    message: string;
    subject?: string;
    whatsappOptIn?: boolean;
  }) {
    const payload: NotificationTemplateData = {
      template: 'admin_message',
      message: input.message,
      subject: input.subject,
    };

    if (input.channel === NotificationChannel.EMAIL) {
      return this.queueEmail({
        proposalId: input.proposalId,
        to: input.to,
        template: payload.template,
        data: payload,
      });
    }

    if (input.channel === NotificationChannel.SMS) {
      return this.queueSms({
        proposalId: input.proposalId,
        to: input.to,
        template: payload.template,
        data: payload,
      });
    }

    return this.queueWhatsapp({
      proposalId: input.proposalId,
      to: input.to,
      template: payload.template,
      data: payload,
      optIn: input.whatsappOptIn,
    });
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
          toHash: hashValue(input.to),
          toMasked: maskContact(input.to),
          template: input.template,
          dataKeys: Object.keys(input.data ?? {}),
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

  private getTeamEmails() {
    const raw = process.env.TEAM_NOTIFICATION_EMAILS ?? '';
    return raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
}

const hashValue = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const maskContact = (value: string) => {
  if (value.includes('@')) {
    const [user, domain] = value.split('@');
    if (!domain) return '***';
    return `${user?.slice(0, 2) ?? '**'}***@${domain}`;
  }
  const digits = value.replace(/\D+/g, '');
  if (digits.length <= 4) return '***';
  return `***${digits.slice(-4)}`;
};
