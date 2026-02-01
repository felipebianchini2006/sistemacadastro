import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminProposalsService } from './admin.proposals.service';
import type {
  AssignProposalDto,
  ListProposalsQuery,
  RejectProposalDto,
  RequestChangesDto,
} from './admin.proposals.dto';
import {
  assignProposalSchema,
  listProposalsQuerySchema,
  rejectProposalSchema,
  requestChangesSchema,
} from './admin.proposals.dto';

type RequestUser = { id: string; roles?: RoleName[] };

@Controller('admin/proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminProposalsController {
  constructor(private readonly service: AdminProposalsService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.ANALYST, RoleName.VIEWER)
  list(@Query() query: ListProposalsQuery) {
    const parsed = listProposalsQuerySchema.parse(query);
    return this.service.list(parsed);
  }

  @Get(':proposalId')
  @Roles(RoleName.ADMIN, RoleName.ANALYST, RoleName.VIEWER)
  getById(@Param('proposalId') proposalId: string) {
    return this.service.getById(proposalId);
  }

  @Post(':proposalId/assign')
  @Roles(RoleName.ADMIN)
  assign(
    @Param('proposalId') proposalId: string,
    @Body() body: AssignProposalDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    const parsed = assignProposalSchema.parse(body);
    return this.service.assign(proposalId, parsed, req.user?.id ?? 'system');
  }

  @Post(':proposalId/request-changes')
  @Roles(RoleName.ADMIN, RoleName.ANALYST)
  requestChanges(
    @Param('proposalId') proposalId: string,
    @Body() body: RequestChangesDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    const parsed = requestChangesSchema.parse(body);
    return this.service.requestChanges(
      proposalId,
      parsed,
      req.user?.id ?? 'system',
    );
  }

  @Post(':proposalId/review/start')
  @Roles(RoleName.ADMIN, RoleName.ANALYST)
  startReview(
    @Param('proposalId') proposalId: string,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.service.startReview(proposalId, req.user?.id ?? 'system');
  }

  @Post(':proposalId/approve')
  @Roles(RoleName.ADMIN, RoleName.ANALYST)
  approve(
    @Param('proposalId') proposalId: string,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.service.approve(proposalId, req.user?.id ?? 'system');
  }

  @Post(':proposalId/reject')
  @Roles(RoleName.ADMIN, RoleName.ANALYST)
  reject(
    @Param('proposalId') proposalId: string,
    @Body() body: RejectProposalDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    const parsed = rejectProposalSchema.parse(body);
    return this.service.reject(proposalId, parsed, req.user?.id ?? 'system');
  }

  @Post(':proposalId/resend-signature-link')
  @Roles(RoleName.ADMIN, RoleName.ANALYST)
  resendSignature(
    @Param('proposalId') proposalId: string,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.service.resendSignatureLink(
      proposalId,
      req.user?.id ?? 'system',
    );
  }

  @Post(':proposalId/export-pdf')
  @Roles(RoleName.ADMIN, RoleName.ANALYST)
  exportPdf(
    @Param('proposalId') proposalId: string,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.service.exportPdf(proposalId, req.user?.id ?? 'system');
  }
}
