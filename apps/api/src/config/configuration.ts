import { Env } from './env.schema';

export const configuration = (env: Env) => ({
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
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
  corsAllowCredentials: env.CORS_ALLOW_CREDENTIALS,
  csrf: {
    enabled: env.CSRF_ENABLED,
    cookieName: env.CSRF_COOKIE_NAME,
    headerName: env.CSRF_HEADER_NAME,
  },
  metrics: {
    enabled: env.METRICS_ENABLED,
    path: env.METRICS_PATH,
  },
  otel: {
    enabled: env.OTEL_ENABLED,
    endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
  },
  retention: {
    draftsDays: env.RETENTION_DAYS_DRAFTS,
    auditLogsDays: env.RETENTION_DAYS_AUDIT_LOGS,
    notificationsDays: env.RETENTION_DAYS_NOTIFICATIONS,
    documentsDays: env.RETENTION_DAYS_DOCUMENTS,
  },
  backup: {
    command: env.BACKUP_COMMAND,
    cron: env.BACKUP_CRON,
  },
  kms: {
    keyId: env.KMS_KEY_ID,
    region: env.KMS_REGION ?? env.S3_REGION,
    endpoint: env.KMS_ENDPOINT,
  },
  vault: {
    addr: env.VAULT_ADDR,
    token: env.VAULT_TOKEN,
  },
});
