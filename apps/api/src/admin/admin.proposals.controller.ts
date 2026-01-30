import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';
import { SignatureService } from '../signature/signature.service';

@Controller('admin/proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminProposalsController {
  constructor(private readonly signatureService: SignatureService) {}

  @Post(':proposalId/approve')
  @Roles(RoleName.ADMIN, RoleName.ANALYST)
  approve(@Param('proposalId') proposalId: string) {
    return this.signatureService.requestSignature(proposalId);
  }
}
