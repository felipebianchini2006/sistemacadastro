import { Body, Controller, Headers, Post } from '@nestjs/common';
import { TotvsWebhookService } from './totvs-webhook.service';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

@Controller('webhooks/totvs')
export class TotvsWebhookController {
  constructor(
    private readonly service: TotvsWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async handle(
    @Body() body: Record<string, unknown>,
    @Headers('x-totvs-signature') signature?: string,
  ) {
    const secret = this.configService.get<string>('TOTVS_WEBHOOK_SECRET', {
      infer: true,
    });

    if (secret && signature) {
      const raw = Buffer.from(JSON.stringify(body ?? {}));
      const computed = createHmac('sha256', secret).update(raw).digest('hex');
      if (computed !== signature) {
        return { ok: false };
      }
    }

    return this.service.handle(body ?? {});
  }
}
