import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [AdminController],
  providers: [JwtAuthGuard, RolesGuard],
})
export class AdminModule {}
