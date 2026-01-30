import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PublicCleanupService } from './public.cleanup';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule, ScheduleModule.forRoot()],
  controllers: [PublicController],
  providers: [PublicService, PublicCleanupService],
})
export class PublicModule {}
