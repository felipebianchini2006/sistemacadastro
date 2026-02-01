import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { AdminModule } from './admin/admin.module';
import { PublicModule } from './public/public.module';
import { SignatureModule } from './signature/signature.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MetricsModule } from './observability/metrics.module';
import { MetricsMiddleware } from './observability/metrics.middleware';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { TotvsModule } from './totvs/totvs.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    AdminModule,
    PublicModule,
    SignatureModule,
    NotificationsModule,
    MetricsModule,
    MaintenanceModule,
    TotvsModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60, limit: 100 }],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-api-key"]',
            'req.headers["x-refresh-token"]',
            'req.headers["x-draft-token"]',
            'req.headers["x-proposal-token"]',
            'req.body.password',
            'req.body.cpf',
            'req.body.email',
            'req.body.phone',
            'req.body.token',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
        genReqId: (req: {
          headers: Record<string, string | string[] | undefined>;
        }) => {
          const header = req.headers['x-correlation-id'];
          if (Array.isArray(header)) {
            return header[0];
          }
          return header ?? randomUUID();
        },
        customProps: (req: IncomingMessage, _res: ServerResponse) => {
          const reqAny = req as {
            correlationId?: string;
            id?: string | number;
          };
          return {
            correlationId: reqAny.correlationId ?? reqAny.id,
          };
        },
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware, MetricsMiddleware).forRoutes('*');
  }
}
