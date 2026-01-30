import { Env } from './env.schema';

export const configuration = (env: Env) => ({
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshTtl: env.JWT_REFRESH_TTL,
  },
  corsOrigins:
    env.CORS_ORIGINS?.split(',')
      .map((v) => v.trim())
      .filter(Boolean) ?? [],
});
