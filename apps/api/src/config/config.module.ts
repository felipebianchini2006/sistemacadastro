import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envSchema } from './env.schema';
import { configuration } from './configuration';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (env) => {
        const parsed = envSchema.parse(env);
        return parsed;
      },
      load: [() => configuration(envSchema.parse(process.env))],
    }),
  ],
})
export class ConfigModule {}
