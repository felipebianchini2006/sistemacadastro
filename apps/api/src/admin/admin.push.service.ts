import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class AdminPushService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  async register(input: {
    adminUserId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: {
        adminUserId: input.adminUserId,
        p256dh: input.p256dh,
        auth: input.auth,
        isActive: true,
      },
      create: {
        adminUserId: input.adminUserId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      },
    });
  }

  async unregister(adminUserId: string, endpoint: string) {
    await this.prisma.pushSubscription.updateMany({
      where: { adminUserId, endpoint },
      data: { isActive: false },
    });
  }

  async getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY ?? '';
  }

  async sendPushToTeam(input: {
    proposalId: string;
    title: string;
    body: string;
    url?: string;
  }) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { isActive: true },
    });

    if (subscriptions.length === 0) return;

    await Promise.all(
      subscriptions.map(async (sub) => {
        const notification = await this.prisma.notification.create({
          data: {
            proposalId: input.proposalId,
            channel: NotificationChannel.PUSH,
            status: NotificationStatus.PENDING,
            payloadRedacted: {
              subscriptionId: sub.id,
              title: input.title,
            },
          },
        });

        await this.jobs.enqueuePushNotification({
          notificationId: notification.id,
          subscriptionId: sub.id,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          title: input.title,
          body: input.body,
          url: input.url,
          requestId: randomUUID(),
        });
      }),
    );
  }
}
