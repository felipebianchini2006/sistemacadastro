import { Injectable } from '@nestjs/common';
import { TotvsSyncStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminTotvsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [pending, synced, failed, total] = await Promise.all([
      this.prisma.totvsSync.count({
        where: { status: TotvsSyncStatus.PENDING },
      }),
      this.prisma.totvsSync.count({
        where: { status: TotvsSyncStatus.SYNCED },
      }),
      this.prisma.totvsSync.count({
        where: { status: TotvsSyncStatus.FAILED },
      }),
      this.prisma.totvsSync.count(),
    ]);

    const lastSync = await this.prisma.totvsSync.findFirst({
      where: { status: TotvsSyncStatus.SYNCED },
      orderBy: { lastSyncAt: 'desc' },
      select: { lastSyncAt: true },
    });

    const lastFailure = await this.prisma.totvsSync.findFirst({
      where: { status: TotvsSyncStatus.FAILED },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return {
      pending,
      synced,
      failed,
      total,
      successRate: total > 0 ? synced / total : 0,
      lastSyncAt: lastSync?.lastSyncAt ?? null,
      lastFailureAt: lastFailure?.updatedAt ?? null,
    };
  }

  async getRecentSyncs() {
    const syncs = await this.prisma.totvsSync.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        proposal: {
          select: {
            id: true,
            protocol: true,
            status: true,
            person: { select: { fullName: true } },
          },
        },
      },
    });

    return syncs.map((sync) => ({
      id: sync.id,
      proposalId: sync.proposalId,
      protocol: sync.proposal?.protocol ?? null,
      candidateName: sync.proposal?.person?.fullName ?? null,
      proposalStatus: sync.proposal?.status ?? null,
      status: sync.status,
      externalId: sync.externalId,
      lastSyncAt: sync.lastSyncAt,
      createdAt: sync.createdAt,
      updatedAt: sync.updatedAt,
    }));
  }
}
