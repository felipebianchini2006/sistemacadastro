import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';
import { CryptoModule } from '../common/crypto/crypto.module';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SignatureService } from './signature.service';
import { ClicksignWebhookService } from './clicksign-webhook.service';
import { ClicksignWebhookController } from './clicksign-webhook.controller';
import { SignatureReminderService } from './signature-reminder.service';

@Module({
  imports: [
    PrismaModule,
    JobsModule,
    CryptoModule,
    StorageModule,
    NotificationsModule,
  ],
  controllers: [ClicksignWebhookController],
  providers: [
    SignatureService,
    ClicksignWebhookService,
    SignatureReminderService,
  ],
  exports: [SignatureService],
})
export class SignatureModule {}
