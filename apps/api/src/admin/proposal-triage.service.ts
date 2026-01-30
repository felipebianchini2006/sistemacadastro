import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ProposalStatus, RoleName } from '@prisma/client';

@Injectable()
export class ProposalTriageService {
  private readonly logger = new Logger(ProposalTriageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('*/5 * * * *')
  async recalcSlaAndAssign() {
    await this.recalculateSla();

    const autoAssign =
      this.configService.get<boolean>('AUTO_ASSIGN_ANALYST', {
        infer: true,
      }) ?? false;
    if (autoAssign) {
      await this.autoAssignAnalysts();
    }
  }

  private async recalculateSla() {
    const slaDays =
      this.configService.get<number>('SLA_DAYS', { infer: true }) ?? 7;
    const now = new Date();

    const proposals = await this.prisma.proposal.findMany({
      where: {
        status: { in: [ProposalStatus.SUBMITTED, ProposalStatus.UNDER_REVIEW] },
      },
      select: {
        id: true,
        submittedAt: true,
        slaStartedAt: true,
        slaDueAt: true,
        slaBreachedAt: true,
      },
    });

    for (const proposal of proposals) {
      const startedAt = proposal.slaStartedAt ?? proposal.submittedAt;
      if (!startedAt) continue;

      const dueAt = new Date(
        startedAt.getTime() + slaDays * 24 * 60 * 60 * 1000,
      );
      const breachedAt = dueAt < now ? now : null;

      const shouldUpdate =
        !proposal.slaDueAt ||
        proposal.slaDueAt.getTime() !== dueAt.getTime() ||
        (!proposal.slaBreachedAt && breachedAt);

      if (shouldUpdate) {
        await this.prisma.proposal.update({
          where: { id: proposal.id },
          data: {
            slaStartedAt: startedAt,
            slaDueAt: dueAt,
            slaBreachedAt: breachedAt ?? proposal.slaBreachedAt ?? null,
          },
        });
      }
    }
  }

  private async autoAssignAnalysts() {
    const analysts = await this.prisma.adminUser.findMany({
      where: {
        isActive: true,
        roles: { some: { role: { name: RoleName.ANALYST } } },
      },
      select: { id: true },
    });

    if (analysts.length === 0) {
      return;
    }

    const counts = await this.prisma.proposal.groupBy({
      by: ['assignedAnalystId'],
      where: {
        assignedAnalystId: { in: analysts.map((a) => a.id) },
        status: { in: [ProposalStatus.SUBMITTED, ProposalStatus.UNDER_REVIEW] },
      },
      _count: { id: true },
    });

    const loadMap = new Map<string, number>();
    for (const analyst of analysts) {
      loadMap.set(analyst.id, 0);
    }
    for (const entry of counts) {
      if (entry.assignedAnalystId) {
        loadMap.set(entry.assignedAnalystId, entry._count.id);
      }
    }

    const unassigned = await this.prisma.proposal.findMany({
      where: {
        status: ProposalStatus.SUBMITTED,
        assignedAnalystId: null,
      },
      select: { id: true },
    });

    for (const proposal of unassigned) {
      const [target] = [...loadMap.entries()].sort((a, b) => a[1] - b[1]);
      if (!target) break;

      await this.prisma.proposal.update({
        where: { id: proposal.id },
        data: {
          assignedAnalystId: target[0],
          statusHistory: {
            create: {
              fromStatus: ProposalStatus.SUBMITTED,
              toStatus: ProposalStatus.SUBMITTED,
              reason: 'Atribuicao automatica',
            },
          },
        },
      });

      loadMap.set(target[0], target[1] + 1);
    }
  }
}
