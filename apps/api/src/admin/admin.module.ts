import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminProposalsController } from './admin.proposals.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SignatureModule } from '../signature/signature.module';

@Module({
  imports: [SignatureModule],
  controllers: [AdminController, AdminProposalsController],
  providers: [JwtAuthGuard, RolesGuard],
})
export class AdminModule {}
