import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { PublicSocialService } from './public.social.service';

@Controller('public/social')
export class PublicSocialController {
  constructor(private readonly service: PublicSocialService) {}

  @Get('authorize')
  async authorize(
    @Query('provider') provider: string,
    @Query('proposalId') proposalId: string | undefined,
    @Query('token') token: string | undefined,
    @Query('draftId') draftId: string | undefined,
    @Query('draftToken') draftToken: string | undefined,
    @Res() res: Response,
  ) {
    if (!provider || (!proposalId && !draftId)) {
      throw new BadRequestException('Parametros obrigatorios');
    }

    const url = await this.service.buildAuthorizeUrl(provider, {
      proposalId,
      token,
      draftId,
      draftToken,
    });
    return res.redirect(url);
  }

  @Get('callback/:provider')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.service.handleCallback(
      provider,
      code,
      state,
      error,
    );
    return res.redirect(result.redirectUrl);
  }

  @Post('disconnect')
  async disconnect(@Body() body: Record<string, string>) {
    const provider = body.provider;
    const proposalId = body.proposalId;
    const token = body.token;
    const draftId = body.draftId;
    const draftToken = body.draftToken ?? (draftId ? body.token : undefined);
    if (!provider || (!proposalId && !draftId)) {
      throw new BadRequestException('Parametros obrigatorios');
    }

    return this.service.disconnect(provider, {
      proposalId,
      token,
      draftId,
      draftToken,
    });
  }
}
