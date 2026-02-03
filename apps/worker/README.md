# Worker

BullMQ workers for OCR, notifications, exports, and integrations.

## OCR worker

Required env vars (same base as API):

- DATABASE_URL
- REDIS_URL
- S3_BUCKET
- S3_REGION
- S3_ENDPOINT (optional for MinIO)
- S3_ACCESS_KEY / S3_SECRET_KEY (optional)

Google auth:

- Uses ADC by default (GOOGLE_APPLICATION_CREDENTIALS or workload identity)
- For dev, set GOOGLE_APPLICATION_CREDENTIALS_JSON with the service account JSON

Optional tuning:

- OCR_LIMITER_MAX (default 10)
- OCR_LIMITER_DURATION_MS (default 60000)
- OCR_CONCURRENCY (default 2)
- OCR_MIN_TEXT_LENGTH (default 20)
- OCR_DIVERGENCE_THRESHOLD (default 0.2, aceita 0.1/0.2/0.3 ou 10/20/30)

Signature env (Clicksign):

- CLICKSIGN_ACCESS_TOKEN
- CLICKSIGN_BASE_URL (default https://sandbox.clicksign.com)
- CLICKSIGN_AUTH_METHOD (email|sms|whatsapp)
- SIGNATURE_DEADLINE_DAYS (default 7)
- SIGNATURE_INTERNAL_REQUIRED (default false)
- SIGNATURE_INTERNAL_SIGNER_NAME/EMAIL/PHONE

Notifications:

- SENDGRID_API_KEY / SENDGRID_FROM
- TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM
- TWILIO_SMS_FROM (optional)
- TWILIO_WHATSAPP_CONTENT_SID (optional)
- NOTIFICATION_CONCURRENCY (default 3)
- WHATSAPP_REQUIRE_OPT_IN (default false)
