import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { JobsModule } from '../jobs/jobs.module';
import { MaintenanceScheduler } from './maintenance.scheduler';

@Module({
  imports: [ConfigModule, JobsModule],
  providers: [MaintenanceScheduler],
})
export class MaintenanceModule {}
