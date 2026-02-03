import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminQueuesService } from './admin.queues.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: AdminQueuesService,
  ) {}

  @Get('ping')
  @Roles(RoleName.ADMIN)
  ping() {
    return { ok: true };
  }

  @Get('analysts')
  @Roles(RoleName.ADMIN, RoleName.ANALYST, RoleName.VIEWER)
  async listAnalysts() {
    const analysts = await this.prisma.adminUser.findMany({
      where: {
        isActive: true,
        roles: {
          some: {
            role: {
              name: {
                in: [RoleName.ADMIN, RoleName.ANALYST],
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return { analysts };
  }

  @Get('queues')
  @Roles(RoleName.ADMIN, RoleName.ANALYST, RoleName.VIEWER)
  listQueues() {
    return this.queues.getOverview();
  }
}
