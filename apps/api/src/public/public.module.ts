import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PublicCleanupService } from './public.cleanup';
import { JobsModule } from '../jobs/jobs.module';
import { StorageModule } from '../storage/storage.module';
import { PublicUploadsController } from './public.uploads.controller';
import { PublicUploadsService } from './public.uploads.service';

@Module({
  imports: [JobsModule, StorageModule, ScheduleModule.forRoot()],
  controllers: [PublicController, PublicUploadsController],
  providers: [PublicService, PublicCleanupService, PublicUploadsService],
})
export class PublicModule {}
