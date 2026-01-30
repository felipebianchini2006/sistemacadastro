# Runbook

## Services

- API: `pnpm -C apps/api dev`
- Worker: `pnpm -C apps/worker dev`
- Web: `pnpm -C apps/web dev`

## Health & Metrics

- Health endpoint: `/health`
- Metrics: `/metrics` (enabled via `METRICS_ENABLED`)
- Tracing: set `OTEL_EXPORTER_OTLP_ENDPOINT` to emit traces

## Backups

- Configure `BACKUP_COMMAND` (example for Postgres):
  - `pg_dump $DATABASE_URL > backups/db_$(date +%F).sql`
- Schedule is controlled by `BACKUP_CRON` (default `0 3 * * *`).
- Backups are executed by the worker via the `maintenance-jobs` queue.
- Verify backup files and retention policy outside the app (storage lifecycle).

## Maintenance Cleanup

- Cleanup job runs daily (03:00) and deletes:
  - Audit logs older than `RETENTION_DAYS_AUDIT_LOGS`
  - Notifications older than `RETENTION_DAYS_NOTIFICATIONS`
  - Documents older than `RETENTION_DAYS_DOCUMENTS` (also removes S3 objects)
- Draft cleanup runs daily (02:00) in API (`PublicCleanupService`).

## Consent

- Consent is required on proposal submission.
- Update `CONSENT_VERSION` when the legal text changes.
- Frontend can override display version via `NEXT_PUBLIC_CONSENT_VERSION`.

## Webhooks

- Clicksign/SendGrid use raw body signature validation.
- Twilio signature validation uses request params and auth token.
- Keep webhook secrets in env and rotate if leaked.

## Incident Checklist

- Check Redis connectivity (queues + rate limiting)
- Verify S3 bucket access and lifecycle rules
- Review worker logs for failed jobs
- Validate KMS access if enabled (envelope decryption failures)
