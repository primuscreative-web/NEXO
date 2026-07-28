# Controlled preview setup

## Recommended providers

- PostgreSQL: **Neon** serverless Postgres. It accepts standard PostgreSQL URLs, supports SSL and isolated branches/databases, and works with Prisma migrations. Alternative: Supabase Postgres project dedicated to preview.
- Redis: **Upstash Redis**. It exposes TLS Redis URLs, expiration, isolated databases, and is compatible with the current Redis adapter. Alternative: Redis Cloud fixed-plan database.

No account, project, secret, deployment, or DNS record is created by this repository.

## Procedure

1. Create an isolated preview PostgreSQL database and a least-privilege runtime user. Require SSL and store `DATABASE_URL` as `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`.
2. Create an isolated TLS Redis database and store `REDIS_URL` as `rediss://default:PASSWORD@HOST:PORT`.
3. Run `pnpm generate:jwt-keys` locally. It writes an Ed25519 PEM pair only under ignored `.preview-secrets/`; copy the files to the secret store without committing them.
4. Start from `.env.preview.example`. Set `APP_ENV=preview`, unique JWT issuer/audience, and temporary HTTPS `WEB_ORIGIN` and `NEXT_PUBLIC_API_URL`.
5. In the preview runner, run `pnpm env:validate`, `pnpm prisma:generate`, and `pnpm prisma:migrate`.
6. Start the API with `pnpm --filter @nexo/api start` and the relay/worker with `pnpm --filter @nexo/worker start`.
7. Set `PREVIEW_CONFIRM=NEXO_PREVIEW`, run `pnpm preview:seed`, then `pnpm preview:smoke`. The smoke validates database, Redis, migration ledger, and API liveness/readiness only.
8. Run the controlled Inbox integration suite against separate disposable test resources when authorization, Outbox, and relay behavior need proof. The smoke does not call WhatsApp, email, SMS, AI, payments, analytics, or storage.
9. Remove synthetic data with `pnpm preview:cleanup`, then rotate database, Redis, and JWT credentials if the preview is shared or disposed.

## Safety

`preview:seed`, `preview:cleanup`, and `preview:smoke` refuse to run unless both `APP_ENV=preview` and `PREVIEW_CONFIRM=NEXO_PREVIEW` are present. Do not set that confirmation in production environments.

## Future decisions

Storage remains behind the existing S3-compatible configuration. WhatsApp, AI, email, payments, analytics, and full observability require product approval, provider selection, and dedicated implementation work before they become runtime dependencies.

## Preview authentication stability

The public Web uses the same-origin `/api` proxy and forwards requests to the
configured Preview runtime. Production builds never fall back to localhost.
Authentication requests include credentials and allow up to 120 seconds for a
Render free-instance cold start; transport failures are converted to safe
Portuguese messages instead of exposing browser errors.

Password recovery uses the notification port. The composed Preview runtime
also exposes a capture endpoint guarded by `PREVIEW_MAILBOX_ACCESS_KEY`, a
minimum 32-character secret that is mandatory outside tests. The endpoint is
available only when `APP_ENV=preview`; production fails closed and never
exposes captured reset links.
