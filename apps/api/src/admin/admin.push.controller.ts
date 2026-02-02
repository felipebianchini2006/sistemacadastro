import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminPushService } from './admin.push.service';

@Controller('admin/push')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminPushController {
  constructor(private readonly service: AdminPushService) {}

  @Get('vapid-key')
  @Roles(RoleName.ADMIN, RoleName.ANALYST, RoleName.VIEWER)
  async getVapidKey() {
    const key = await this.service.getVapidPublicKey();
    return { publicKey: key };
  }

  @Post('subscribe')
  @Roles(RoleName.ADMIN, RoleName.ANALYST, RoleName.VIEWER)
  async subscribe(
    @Req() req: { user: { sub: string } },
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    await this.service.register({
      adminUserId: req.user.sub,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    });
    return { ok: true };
  }

  @Delete('unsubscribe')
  @Roles(RoleName.ADMIN, RoleName.ANALYST, RoleName.VIEWER)
  async unsubscribe(
    @Req() req: { user: { sub: string } },
    @Body() body: { endpoint: string },
  ) {
    await this.service.unregister(req.user.sub, body.endpoint);
    return { ok: true };
  }
}
