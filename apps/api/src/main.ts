import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import express from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';
import { createCsrfMiddleware } from './common/middleware/csrf.middleware';
import { initOpenTelemetry } from './observability/otel';

async function bootstrap() {
  await initOpenTelemetry();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(
    express.json({
      verify: (
        req: Request & { rawBody?: Buffer },
        _res: Response,
        buf: Buffer,
      ) => {
        if (
          req.originalUrl?.startsWith('/webhooks/clicksign') ||
          req.originalUrl?.startsWith('/webhooks/sendgrid')
        ) {
          req.rawBody = buf;
        }
      },
    }),
  );
  app.use(cookieParser());
  app.use(helmet());
  app.useGlobalFilters(new ProblemDetailsFilter());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', { infer: true }) ?? 3001;
  const corsOrigins = configService.get<string[]>('corsOrigins') ?? [];
  const nodeEnv =
    configService.get<string>('NODE_ENV', { infer: true }) ?? 'development';
  const allowCredentials =
    configService.get<boolean>('CORS_ALLOW_CREDENTIALS', { infer: true }) ??
    true;

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      if (corsOrigins.length === 0 && nodeEnv !== 'production') {
        return callback(null, true);
      }
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: allowCredentials,
  });

  app.use(createCsrfMiddleware(configService));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sistema Cadastro API')
    .setDescription('API do sistema de cadastro')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
}

bootstrap();
