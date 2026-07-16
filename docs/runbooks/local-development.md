# Local Development Runbook

## Start

1. Copy `.env.example` to `.env`.
2. Run `pnpm install --frozen-lockfile`.
3. Leave managed-service variables unset for infrastructure-free work, or fill them with development-only Supabase/Neon and Upstash credentials.
4. If a development database is configured, run `pnpm prisma:migrate` against that isolated database.
5. Run `pnpm dev`.

## Diagnose

- `/health/live` verifies the process and never requires external infrastructure.
- API readiness checks both PostgreSQL and Redis at `/health/ready`.
- Do not bypass readiness by changing it to liveness.
- `pnpm test:integration` uses only `TEST_DATABASE_URL` and `TEST_REDIS_URL`; it skips provider checks when they are absent.

## Stop

Stop the local application processes. Managed development resources are not deleted by repository commands.

## Optional containers

Docker Compose is retained as a future reproducibility option, not as a local prerequisite. Its validation runs only through the manually dispatched `Optional container validation` workflow.
