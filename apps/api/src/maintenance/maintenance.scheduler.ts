import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { JobsService } from '../jobs/jobs.service';

const BACKUP_CRON = process.env.BACKUP_CRON ?? '0 3 * * *';

@Injectable()
export class MaintenanceScheduler {
  private readonly logger = new Logger(MaintenanceScheduler.name);

  constructor(
    private readonly jobs: JobsService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduleCleanup() {
    await this.jobs.enqueueMaintenanceCleanup({});
  }

  @Cron(BACKUP_CRON)
  async scheduleBackup() {
    const command = this.configService.get<string>('BACKUP_COMMAND', {
      infer: true,
    });
    if (!command) {
      this.logger.debug('Backup skipped (BACKUP_COMMAND not set)');
      return;
    }

    await this.jobs.enqueueMaintenanceBackup({ command });
  }
}
