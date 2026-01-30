import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminProposalsController } from './admin.proposals.controller';
import { AdminProposalsService } from './admin.proposals.service';
import { ProposalTriageService } from './proposal-triage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SignatureModule } from '../signature/signature.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JobsModule } from '../jobs/jobs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CryptoModule } from '../common/crypto/crypto.module';

@Module({
  imports: [
    SignatureModule,
    NotificationsModule,
    JobsModule,
    PrismaModule,
    CryptoModule,
  ],
  controllers: [AdminController, AdminProposalsController],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    AdminProposalsService,
    ProposalTriageService,
  ],
})
export class AdminModule {}
