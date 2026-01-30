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
