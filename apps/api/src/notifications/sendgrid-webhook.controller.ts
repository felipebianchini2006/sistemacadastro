import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { SendgridWebhookService } from './sendgrid-webhook.service';

export type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('webhooks/sendgrid')
export class SendgridWebhookController {
  constructor(
    private readonly service: SendgridWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async handle(
    @Req() req: RawBodyRequest,
    @Headers('x-twilio-email-event-webhook-signature') signature?: string,
    @Headers('x-twilio-email-event-webhook-timestamp') timestamp?: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const publicKey = this.configService.get<string>(
      'SENDGRID_WEBHOOK_PUBLIC_KEY',
      { infer: true },
    );

    const valid = this.service.verifySignature(
      rawBody,
      signature,
      timestamp,
      publicKey,
    );

    if (!valid) {
      throw new BadRequestException('Assinatura invalida');
    }

    const events = Array.isArray(req.body) ? req.body : [];
    await this.service.handleEvents(events as Record<string, unknown>[]);

    return { ok: true };
  }
}
