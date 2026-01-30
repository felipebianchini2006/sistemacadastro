import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from '../prisma/prisma.health';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get()
  @SkipThrottle({ default: true })
  @HealthCheck()
  check() {
    return this.health.check([() => this.prismaHealth.isHealthy('database')]);
  }
}
