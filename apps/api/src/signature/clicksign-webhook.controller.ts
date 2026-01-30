import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { ClicksignWebhookService } from './clicksign-webhook.service';

export type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('webhooks/clicksign')
export class ClicksignWebhookController {
  constructor(private readonly service: ClicksignWebhookService) {}

  @Post()
  async handle(
    @Req() req: RawBodyRequest,
    @Headers('x-clicksign-signature') signature?: string,
    @Headers('x-hub-signature-256') hubSignature?: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));

    const valid = this.service.verifySignature(
      rawBody,
      signature ?? hubSignature,
    );
    if (!valid) {
      throw new BadRequestException('Assinatura invalida');
    }

    let payload: Record<string, unknown> = {};
    if (req.body && typeof req.body === 'object') {
      payload = req.body as Record<string, unknown>;
    } else {
      try {
        payload = JSON.parse(rawBody.toString('utf8')) as Record<
          string,
          unknown
        >;
      } catch {
        payload = {};
      }
    }

    return this.service.handleWebhook(payload, rawBody);
  }
}
