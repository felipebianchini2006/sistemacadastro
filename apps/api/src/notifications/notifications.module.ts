import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';
import { NotificationsService } from './notifications.service';
import { SendgridWebhookService } from './sendgrid-webhook.service';
import { TwilioWebhookService } from './twilio-webhook.service';
import { SendgridWebhookController } from './sendgrid-webhook.controller';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { OtpService } from './otp.service';
import { AdminPushService } from '../admin/admin.push.service';

@Module({
  imports: [PrismaModule, JobsModule],
  providers: [
    NotificationsService,
    SendgridWebhookService,
    TwilioWebhookService,
    OtpService,
    AdminPushService,
  ],
  controllers: [SendgridWebhookController, TwilioWebhookController],
  exports: [NotificationsService, OtpService, AdminPushService],
})
export class NotificationsModule {}
