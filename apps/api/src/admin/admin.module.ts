import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminProposalsController } from './admin.proposals.controller';
import { AdminProposalsService } from './admin.proposals.service';
import { AdminTotvsController } from './admin.totvs.controller';
import { AdminTotvsService } from './admin.totvs.service';
import { AdminPushController } from './admin.push.controller';
import { AdminPushService } from './admin.push.service';
import { AdminQueuesService } from './admin.queues.service';
import { ProposalTriageService } from './proposal-triage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SignatureModule } from '../signature/signature.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JobsModule } from '../jobs/jobs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CryptoModule } from '../common/crypto/crypto.module';
import { StorageModule } from '../storage/storage.module';
import { PublicModule } from '../public/public.module';

@Module({
  imports: [
    SignatureModule,
    NotificationsModule,
    JobsModule,
    PrismaModule,
    CryptoModule,
    StorageModule,
    PublicModule,
  ],
  controllers: [
    AdminController,
    AdminProposalsController,
    AdminTotvsController,
    AdminPushController,
  ],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    AdminProposalsService,
    AdminTotvsService,
    AdminPushService,
    AdminQueuesService,
    ProposalTriageService,
  ],
})
export class AdminModule {}
