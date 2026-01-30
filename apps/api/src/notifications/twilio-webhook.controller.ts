import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { TwilioWebhookService } from './twilio-webhook.service';
import { validateRequest } from 'twilio';

@Controller('webhooks/twilio')
export class TwilioWebhookController {
  constructor(
    private readonly service: TwilioWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async handle(
    @Req() req: Request,
    @Headers('x-twilio-signature') signature?: string,
  ) {
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', {
      infer: true,
    });

    if (authToken && signature) {
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const valid = validateRequest(authToken, signature, url, req.body ?? {});
      if (!valid) {
        throw new BadRequestException('Assinatura invalida');
      }
    }

    return this.service.handleStatusCallback(
      (req.body ?? {}) as Record<string, string>,
    );
  }
}
