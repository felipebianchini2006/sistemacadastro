import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PublicCleanupService } from './public.cleanup';
import { JobsModule } from '../jobs/jobs.module';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CryptoModule } from '../common/crypto/crypto.module';
import { PublicUploadsController } from './public.uploads.controller';
import { PublicUploadsService } from './public.uploads.service';

@Module({
  imports: [JobsModule, StorageModule, NotificationsModule, CryptoModule],
  controllers: [PublicController, PublicUploadsController],
  providers: [PublicService, PublicCleanupService, PublicUploadsService],
})
export class PublicModule {}
