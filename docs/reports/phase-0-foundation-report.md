# NEXO — Phase 0 Foundation Report

**Date:** 2026-07-16  
**Architecture baseline:** NEXO Foundation Architecture v2.1  
**Scope:** technical foundation only

## Executive summary

Phase 0 established an isolated pnpm/Turborepo monorepo with four independently runnable applications: Next.js Web, NestJS API, NestJS Worker and NestJS Webhook Gateway. The foundation uses TypeScript strict, ESLint, Prettier, Vitest, Playwright, Prisma/PostgreSQL, Redis, structured logging, trace correlation, health endpoints and GitHub Actions.

No Inbox, CRM, AI, Voice, Workflow, Billing, Marketplace or Analytics capability was implemented. Bounded contexts remain deferred to their approved phases.

Local development does not require Docker or external infrastructure. Liveness, lint, formatting, typecheck, unit tests, build and E2E smoke tests run without provider credentials. Managed development resources are optional and isolated; GitHub Actions supplies ephemeral PostgreSQL and Redis for the real protocol integration tests.

## Final foundation architecture

```text
NEXO/
├── apps/
│   ├── web/                  Next.js App Router and health surface
│   ├── api/                  NestJS API and dependency readiness
│   ├── worker/               asynchronous composition root
│   └── webhook-gateway/      isolated webhook composition root
├── packages/
│   ├── cache/                cache port and Redis adapter
│   ├── config/               validated environment contracts
│   ├── database/             PostgreSQL port, adapter, Prisma and migrations
│   ├── events/               transport-independent Event Bus
│   ├── observability/        structured logs and trace correlation
│   ├── shared/               framework-free health primitives
│   ├── storage/              object-storage port and test adapter
│   └── testing/              shared test foundation
├── tests/
│   ├── integration/          isolated PostgreSQL/Redis protocol checks
│   └── e2e/                  four-service health smoke suite
├── infrastructure/docker/    optional future container image
├── docs/                     ADRs, architecture, security and runbooks
└── .github/workflows/        required CI and optional container validation
```

## Main decisions

- pnpm 11 with an immutable lockfile and explicit dependency build allowlist.
- Turborepo for dependency-aware task orchestration.
- Node.js 24 and TypeScript 5.9 strict, including unchecked-index and exact-optional checks.
- Next.js 16 App Router for Web and NestJS 11/Fastify for service composition roots.
- PostgreSQL 17/Prisma 7 as the database baseline; no business tables were created.
- Provider access behind `DatabaseHealthPort`, `CacheHealthPort` and `ObjectStoragePort`.
- Liveness is infrastructure-independent; API readiness checks configured PostgreSQL and Redis.
- CI integration data is ephemeral. Local integrations require dedicated `TEST_*` sandbox resources and skip safely when absent.
- Dockerfiles and Compose are retained only as an optional future reproducibility path.
- Security audit blocks high/critical advisories; the final lockfile has no known advisories.

## ADRs

ADRs 001–011 record the approved architectural baseline. ADR-012 records the replacement of mandatory local Docker with managed, isolated development services and ephemeral CI infrastructure.

## Docker dependency replacement matrix

| Previous dependency             | Replacement                                | Local behavior                                          | CI behavior                                        |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------- |
| Local PostgreSQL container      | Supabase or Neon development project       | Optional; required only for persistence/readiness       | Ephemeral PostgreSQL service                       |
| Local Redis container           | Upstash Redis development database         | Optional; required only for readiness/cache integration | Ephemeral Redis service                            |
| Future local object storage     | Supabase Storage or S3-compatible provider | Not required in Phase 0; in-memory test adapter         | Provider contract tests; external adapter deferred |
| Compose for application startup | Native pnpm application processes          | `pnpm dev` / per-app commands                           | Native build and E2E processes                     |
| Compose as a required gate      | Manual optional workflow                   | Not executed                                            | `Optional container validation`, manual only       |

## Commands that pass without Docker

- `pnpm install --frozen-lockfile`
- `pnpm prisma:validate`
- `pnpm prisma:generate`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`
- `pnpm test:integration` (safe skip without isolated `TEST_*` resources)
- `pnpm test:coverage`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm security:audit`
- `pnpm dev` and all four application start commands

## Tests requiring external infrastructure

Only the two protocol-level integration assertions require PostgreSQL and Redis. They execute when both `TEST_DATABASE_URL` and `TEST_REDIS_URL` are present. They never fall back to development or production variables. GitHub Actions configures both values against disposable services and also applies the foundation migration there.

## Credentials to configure later

For optional development persistence/readiness:

- `DATABASE_URL`: isolated Supabase or Neon development database.
- `REDIS_URL`: isolated Upstash development database using TLS.
- `TEST_DATABASE_URL`: disposable test database, separate from development.
- `TEST_REDIS_URL`: disposable test Redis, separate from development.
- `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`: only when storage enters an approved product phase.
- `OTEL_EXPORTER_OTLP_ENDPOINT`: optional non-production telemetry collector.

Production credentials are prohibited in local development and tests. `.env.example` contains placeholders only and `.env*` files are ignored except the example.

## Validation evidence

| Gate                 | Result                   | Evidence                                                                                                             |
| -------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Reproducible install | Pass                     | pnpm 11.13.1, frozen lockfile, build allowlist                                                                       |
| Formatter            | Pass                     | all tracked source/document files match Prettier                                                                     |
| Lint                 | Pass                     | 17 dependency-aware tasks across 12 packages                                                                         |
| Typecheck            | Pass                     | 17 dependency-aware tasks, TypeScript strict                                                                         |
| Unit tests           | Pass                     | 13 assertions; no failures                                                                                           |
| Integration local    | Safe skip                | 2 protocol assertions require isolated `TEST_*` resources                                                            |
| Integration CI       | Configured               | ephemeral PostgreSQL 17.6 and Redis 8.2 services                                                                     |
| Coverage             | Pass                     | reports generated per package; tested primitives reach 85–100%, provider/composition code is integration/E2E covered |
| Build                | Pass                     | all 12 packages/apps, including optimized Next.js output                                                             |
| E2E smoke            | Pass                     | Web, API, Worker and Webhook Gateway: 4/4                                                                            |
| Health checks        | Pass                     | four liveness endpoints; API readiness fails closed without providers                                                |
| Security audit       | Pass                     | no known vulnerabilities in final lockfile                                                                           |
| Secrets              | Pass                     | placeholder-only example; secret files and generated artifacts ignored                                               |
| Docker               | Optional                 | artifacts retained; excluded from required gates by ADR-012                                                          |
| CI                   | Pass                     | GitHub Actions run 29470041712: quality and Gitleaks jobs green                                                       |

## Known limitations and accepted risks

- Local protocol integration is skipped until dedicated sandbox credentials are supplied; CI remains the authoritative integration gate.
- Coverage is intentionally reported per package. Composition roots and generated Prisma code reduce aggregate percentages and are exercised through E2E/integration rather than artificial unit tests.
- Managed providers introduce network latency, quotas and vendor operations; ports preserve future substitution.
- The optional container workflow is not a Phase 0 completion requirement.

## Files and dependencies

The repository contains 122 source, configuration, documentation and normative input artifacts before generated outputs. Key runtime dependencies are Next.js/React, NestJS/Fastify, Prisma/PostgreSQL, ioredis, Zod, Pino and OpenTelemetry API. Key toolchain dependencies are pnpm, Turborepo, TypeScript, ESLint, Prettier, Vitest, Playwright, tsup and SWC.

## Suggested commit

`feat: establish NEXO Phase 0 foundation`

## Next phase

The Phase 0 baseline is complete and validated by GitHub Actions run `29470041712`. Phase 1 scope remains Identity and Organization foundations: authentication, organizations, memberships, teams, RBAC/ABAC and audit.
