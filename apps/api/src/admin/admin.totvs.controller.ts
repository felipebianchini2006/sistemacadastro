import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminTotvsService } from './admin.totvs.service';

@Controller('admin/totvs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminTotvsController {
  constructor(private readonly service: AdminTotvsService) {}

  @Get('stats')
  @Roles(RoleName.ADMIN, RoleName.ANALYST, RoleName.VIEWER)
  getStats() {
    return this.service.getStats();
  }

  @Get('recent')
  @Roles(RoleName.ADMIN, RoleName.ANALYST, RoleName.VIEWER)
  getRecent() {
    return this.service.getRecentSyncs();
  }
}
