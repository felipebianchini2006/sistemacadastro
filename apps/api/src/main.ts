import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import type { Request } from 'express';

import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useBodyParser('json', {
    verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
      if (req.originalUrl?.startsWith('/webhooks/clicksign')) {
        req.rawBody = buf;
      }
    },
  });
  app.use(cookieParser());
  app.useGlobalFilters(new ProblemDetailsFilter());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', { infer: true }) ?? 3001;
  const corsOrigins = configService.get<string[]>('corsOrigins') ?? [];

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

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
