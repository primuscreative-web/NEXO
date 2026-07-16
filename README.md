# NEXO

Enterprise SaaS foundation for omnichannel operations, CRM, automation, voice, and AI. Phase 0 contains technical infrastructure only; no business capability is implemented.

## Requirements

- Node.js 24.13+
- Corepack with pnpm 11.13.1

Docker is optional. Local lint, types, unit tests, build, Web, API, Worker and Webhook Gateway do not require it.

On Windows without permission to write Corepack shims under Program Files:

```powershell
corepack enable pnpm --install-directory "$env:LOCALAPPDATA\Microsoft\WindowsApps"
```

## Bootstrap

```powershell
Copy-Item .env.example .env
pnpm install --frozen-lockfile
pnpm dev
```

The liveness endpoints work without external services. To use API readiness or persistence, configure development-only Supabase/Neon and Upstash credentials in `.env`. Apply migrations only to that isolated database with `pnpm prisma:migrate`.

| Surface                | URL                                |
| ---------------------- | ---------------------------------- |
| Web                    | http://localhost:3000              |
| API health             | http://localhost:3001/health/live  |
| API readiness          | http://localhost:3001/health/ready |
| Worker health          | http://localhost:3002/health/live  |
| Webhook Gateway health | http://localhost:3003/health/live  |

## Validation

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:coverage
pnpm build
pnpm test:e2e
pnpm security:audit
```

`pnpm test:integration` skips provider checks unless both `TEST_DATABASE_URL` and `TEST_REDIS_URL` point to disposable test resources. GitHub Actions always supplies ephemeral PostgreSQL and Redis services. Docker Compose remains an optional, manually validated infrastructure alternative.

## Architecture

```text
apps/
  web/               Next.js App Router shell
  api/               NestJS API composition root
  worker/            asynchronous processing composition root
  webhook-gateway/   isolated public webhook edge
packages/
  config/            validated environment configuration
  cache/             replaceable cache health port and Redis adapter
  database/          Prisma, migrations, and PostgreSQL technical access
  events/            transport-agnostic Event Bus contract
  observability/     structured logging and tracing correlation
  shared/            minimal framework-free primitives
  storage/           replaceable object-storage port and test adapter
  testing/           shared test constants and future harnesses
```

Bounded contexts will be created under `packages/contexts/<context>` only when their approved phase starts. Applications may import public context APIs; applications never import other applications.

Normative architecture: [NEXO Foundation Architecture v2.1](./NEXO_Foundation_Architecture_v2.1.md).

## Security

Never commit `.env`, access tokens, production data, credentials, private keys, or provider payloads. See [SECURITY.md](./SECURITY.md).
