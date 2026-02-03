import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  DATA_ENCRYPTION_KEY: z.string().min(32),
  KMS_KEY_ID: z.string().optional(),
  KMS_REGION: z.string().optional(),
  KMS_ENDPOINT: z.string().optional(),
  VAULT_ADDR: z.string().optional(),
  VAULT_TOKEN: z.string().optional(),

  CORS_ORIGINS: z.string().optional(),
  CORS_ALLOW_CREDENTIALS: z.coerce.boolean().optional().default(true),

  CSRF_ENABLED: z.coerce.boolean().optional().default(true),
  CSRF_COOKIE_NAME: z.string().default('csrf_token'),
  CSRF_HEADER_NAME: z.string().default('x-csrf-token'),

  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().optional(),

  UPLOAD_PRESIGN_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  UPLOAD_MAX_SIZE_MB: z.coerce.number().int().positive().default(10),
  UPLOAD_MIN_WIDTH: z.coerce.number().int().positive().default(600),
  UPLOAD_MIN_HEIGHT: z.coerce.number().int().positive().default(600),

  EMAIL_MX_CHECK: z.coerce.boolean().optional().default(false),

  CONSENT_VERSION: z.string().default('v1'),
  PRIVACY_POLICY_VERSION: z.string().default('v1'),

  METRICS_ENABLED: z.coerce.boolean().optional().default(true),
  METRICS_PATH: z.string().default('/metrics'),

  OTEL_ENABLED: z.coerce.boolean().optional().default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),

  RETENTION_DAYS_DRAFTS: z.coerce.number().int().positive().default(7),
  RETENTION_DAYS_AUDIT_LOGS: z.coerce.number().int().positive().default(365),
  RETENTION_DAYS_NOTIFICATIONS: z.coerce.number().int().positive().default(180),
  RETENTION_DAYS_DOCUMENTS: z.coerce.number().int().positive().default(365),

  BACKUP_COMMAND: z.string().optional(),
  BACKUP_CRON: z.string().default('0 3 * * *'),

  CLICKSIGN_ACCESS_TOKEN: z.string().min(10),
  CLICKSIGN_BASE_URL: z.string().url().optional(),
  CLICKSIGN_WEBHOOK_SECRET: z.string().optional(),
  CLICKSIGN_AUTH_METHOD: z
    .enum(['email', 'sms', 'whatsapp'])
    .optional()
    .default('email'),
  SIGNATURE_DEADLINE_DAYS: z.coerce.number().int().positive().default(7),

  SIGNATURE_INTERNAL_SIGNER_NAME: z.string().optional(),
  SIGNATURE_INTERNAL_SIGNER_EMAIL: z.string().optional(),
  SIGNATURE_INTERNAL_SIGNER_PHONE: z.string().optional(),
  SIGNATURE_INTERNAL_REQUIRED: z.coerce.boolean().optional().default(false),

  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM: z.string().optional(),
  SENDGRID_WEBHOOK_PUBLIC_KEY: z.string().optional(),
  SENDGRID_TEMPLATE_PROPOSAL_RECEIVED: z.string().optional(),
  SENDGRID_TEMPLATE_PROPOSAL_PENDING: z.string().optional(),
  SENDGRID_TEMPLATE_PROPOSAL_APPROVED: z.string().optional(),
  SENDGRID_TEMPLATE_PROPOSAL_REJECTED: z.string().optional(),
  SENDGRID_TEMPLATE_PROPOSAL_SIGNED: z.string().optional(),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  TWILIO_SMS_FROM: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
  TWILIO_WHATSAPP_CONTENT_SID: z.string().optional(),

  SLA_DAYS: z.coerce.number().int().positive().default(7),
  MIGRATION_SLA_DAYS: z.coerce.number().int().positive().optional(),
  SLA_DUE_SOON_HOURS: z.coerce.number().int().positive().default(24),
  AUTO_ASSIGN_ANALYST: z.coerce.boolean().optional().default(false),
  PUBLIC_TRACKING_BASE_URL: z.string().optional(),
  PUBLIC_CADASTRO_BASE_URL: z.string().optional(),

  TOTVS_BASE_URL: z.string().optional(),
  TOTVS_TOKEN: z.string().optional(),
  TOTVS_WEBHOOK_SECRET: z.string().optional(),

  TEAM_NOTIFICATION_EMAILS: z.string().optional(),

  SOCIAL_OAUTH_STATE_SECRET: z.string().min(16).optional(),
  SOCIAL_STATE_TTL_MINUTES: z.coerce.number().int().positive().default(20),
  SOCIAL_REDIRECT_SUCCESS_URL: z.string().optional(),
  SOCIAL_REDIRECT_ERROR_URL: z.string().optional(),
  SOCIAL_REDIRECT_DRAFT_SUCCESS_URL: z.string().optional(),
  SOCIAL_REDIRECT_DRAFT_ERROR_URL: z.string().optional(),

  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  SPOTIFY_REDIRECT_URI: z.string().optional(),

  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_REDIRECT_URI: z.string().optional(),

  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  FACEBOOK_REDIRECT_URI: z.string().optional(),

  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_REDIRECT_URI: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
