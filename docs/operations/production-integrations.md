# Production integrations

| Integration | Purpose | Status | Required variables |
| --- | --- | --- | --- |
| PostgreSQL | Primary data and RLS | Required | `DATABASE_URL` |
| Redis | Cache and Outbox relay coordination | Required | `REDIS_URL` |
| S3-compatible storage | Future attachment storage | Placeholder | `STORAGE_*` |
| OpenTelemetry | Optional telemetry export | Optional | `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Ed25519 JWT keys | Authentication signing | Required in production | `AUTH_JWT_PRIVATE_KEY`, `AUTH_JWT_PUBLIC_KEY`, `AUTH_JWT_ISSUER`, `AUTH_JWT_AUDIENCE` |
| Web/API routing | Browser to API origin | Required | `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL` |

No WhatsApp, AI, email, payment, analytics, or production channel credential is consumed by the current runtime code. Those providers require explicit approval and a dedicated implementation checkpoint before deployment.

## Environment inventory

| Variable | Secret | Environments | Use |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | preview, production | Prisma/runtime database connection |
| `REDIS_URL` | Yes | preview, production | Worker and health integration |
| `AUTH_JWT_PRIVATE_KEY` | Yes | production | Ed25519 signing key |
| `AUTH_JWT_PUBLIC_KEY` | No | production | JWT verification key |
| `WEB_ORIGIN` | No | all | API CORS allowlist |
| `NEXT_PUBLIC_API_URL` | Public | web | API base URL |
| `STORAGE_*` | Mixed | future | S3-compatible adapter configuration |
