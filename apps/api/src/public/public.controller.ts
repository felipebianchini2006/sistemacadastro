import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { PublicService } from './public.service';
import type {
  CreateDraftDto,
  OtpSendDto,
  OtpVerifyDto,
  SubmitProposalDto,
  UpdateDraftDto,
} from './public.dto';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Post('drafts')
  @Throttle({ default: { limit: 20, ttl: 60 } })
  createDraft(@Body() body: CreateDraftDto) {
    return this.publicService.createDraft(body ?? {});
  }

  @Patch('drafts/:draftId')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  updateDraft(
    @Param('draftId') draftId: string,
    @Body() body: UpdateDraftDto,
    @Headers('x-draft-token') draftToken?: string,
  ) {
    return this.publicService.updateDraft(draftId, body, draftToken);
  }

  @Get('drafts/:draftId')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  getDraft(
    @Param('draftId') draftId: string,
    @Query('token') token?: string,
    @Headers('x-draft-token') headerToken?: string,
  ) {
    return this.publicService.getDraft(draftId, headerToken ?? token);
  }

  @Post('drafts/:draftId/ocr')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  requestDraftOcr(
    @Param('draftId') draftId: string,
    @Headers('x-draft-token') draftToken?: string,
  ) {
    return this.publicService.requestDraftOcr(draftId, draftToken);
  }

  @Get('drafts/:draftId/ocr')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  getDraftOcr(
    @Param('draftId') draftId: string,
    @Query('token') token?: string,
    @Headers('x-draft-token') headerToken?: string,
  ) {
    return this.publicService.getDraftOcr(draftId, headerToken ?? token);
  }

  @Post('proposals')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  submitProposal(@Body() body: SubmitProposalDto, @Req() req: Request) {
    return this.publicService.submitProposal(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @Get('proposals/track')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  track(
    @Query('protocol') protocol: string,
    @Query('token') token: string,
    @Req() req: Request,
  ) {
    return this.publicService.trackProposal(protocol, token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @Post('proposals/delete')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  delete(@Body() body: unknown, @Req() req: Request) {
    return this.publicService.deleteProposal(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @Post('otp/send')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  sendOtp(@Body() body: OtpSendDto) {
    return this.publicService.sendOtp(body ?? {});
  }

  @Post('otp/verify')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  verifyOtp(@Body() body: OtpVerifyDto) {
    return this.publicService.verifyOtp(body ?? {});
  }
}
