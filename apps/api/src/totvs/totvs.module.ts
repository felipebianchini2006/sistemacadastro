import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TotvsWebhookController } from './totvs-webhook.controller';
import { TotvsWebhookService } from './totvs-webhook.service';

@Module({
  imports: [PrismaModule],
  controllers: [TotvsWebhookController],
  providers: [TotvsWebhookService],
})
export class TotvsModule {}
