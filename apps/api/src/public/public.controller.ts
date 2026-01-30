import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { PublicService } from './public.service';
import {
  CreateDraftDto,
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

  @Post('proposals')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  submitProposal(@Body() body: SubmitProposalDto) {
    return this.publicService.submitProposal(body);
  }

  @Get('proposals/track')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  track(@Query('protocol') protocol: string, @Query('token') token: string) {
    return this.publicService.trackProposal(protocol, token);
  }
}
