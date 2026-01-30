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

  CORS_ORIGINS: z.string().optional(),

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
});

export type Env = z.infer<typeof envSchema>;
