# NEXO Phase 1 report

Status: under final independent review on 2026-07-16. The original branch CI was green, but the review identified mandatory Phase 1 corrections. No merge into `main` has been performed.

## Executive summary

Phase 1 establishes owned production authentication, global users, N:N organization membership, teams, tenant-scoped RBAC/ABAC, append-only audit and transactional outbox persistence. The web application exposes the principal identity and administration surfaces in Brazilian Portuguese using semantic light/dark tokens. No Inbox, channel, CRM, AI, voice, knowledge, workflow, billing, marketplace or product analytics capability was introduced.

## Architecture and decisions

- ADR 013 selects an owned identity domain behind narrow crypto/token adapters, Ed25519 access tokens and rotating opaque refresh-token families.
- ADR 014 adopts PostgreSQL forced RLS as defense in depth, while preserving explicit domain, application and persistence tenant checks.
- Context boundaries are `identity`, `organization`, minimal `notification` and `platform`; applications consume only public exports.
- The email delivery contract is replaceable; official tests use an idempotent in-memory adapter and no real recipient.
- PostgreSQL and Redis remain external locally and ephemeral GitHub Actions services officially. Docker Desktop is not required.

## Security controls

Argon2id, email confirmation, non-enumerating recovery, lockout, short access tokens, refresh rotation/reuse detection, hashed tokens, CSRF double-submit, restricted CORS, secure cookie settings, input allow-listing, tenant-aware constraints, IDOR masking, forced RLS, append-only audit, sanitized metadata, dependency audit and Gitleaks are covered. Production must use a non-superuser runtime database role for RLS to be meaningful and must configure dedicated Ed25519 keys and a real email adapter.

## Validation evidence

- Branch: `codex/phase-1-identity-organization`.
- Pull request: <https://github.com/primuscreative-web/NEXO/pull/9>.
- Green workflow: <https://github.com/primuscreative-web/NEXO/actions/runs/29502448941>.
- Validated implementation HEAD: `1aa2018df8e2c0255ceb21d273c9059eeb7f0fde` (the closure commit changes documentation only).
- Scope relative to `d1256c3`: 82 files, 6,596 insertions and 132 deletions before this report closure.
- `pnpm install --frozen-lockfile`: passed.
- Prisma schema validation, generation and immutable migration deployment: passed against PostgreSQL 17.6 ephemeral CI service.
- Build, Prettier, ESLint and strict TypeScript: passed.
- Unit tests: passed across every workspace package.
- Integration tests: passed against real ephemeral PostgreSQL and Redis services, including migration, forced RLS, cross-tenant writes and append-only audit.
- E2E: passed, covering service health and the Phase 1 identity/organization journey through API and persistence.
- Coverage: passed. Coverage is emitted per package rather than as a misleading monorepo average; critical context reports include up to 96% statements/75% branches, and the complete HTML/LCOV evidence is attached to the workflow.
- Dependency audit: passed with no known high or critical vulnerabilities.
- Gitleaks secret scan: passed.

Local provider-dependent tests explicitly skip when disposable `TEST_DATABASE_URL` and `TEST_REDIS_URL` are absent; they never fall back to development or production resources. Docker Desktop was not used or required.

## Delivered surface

- Identity: registration, email verification, login/logout, password recovery/change, rotating refresh families, reuse detection, active session listing and revocation.
- Organization: global users, N:N memberships, active organization selection, invitations, teams, system roles, granular permissions and last-owner protection.
- Authorization: reusable deny-by-default RBAC plus focused ABAC for tenant, status, ownership and session constraints.
- Security and data: tenant-aware constraints, forced RLS defense in depth, IDOR masking, rate limits, CSRF, safe cookies, append-only audit and sanitized metadata.
- Events: versioned transactional Outbox records with correlation, causation, tenant metadata and explicit idempotency key.
- Web: Brazilian Portuguese authentication/onboarding and administration surfaces, responsive semantic light/dark tokens, protected routes and accessible states.

## Accepted residual risks and external configuration

- Production requires a restricted non-superuser PostgreSQL runtime role; otherwise PostgreSQL `BYPASSRLS` can bypass the defense-in-depth policies.
- Production requires dedicated Ed25519 signing keys and a production email delivery adapter. CI keys are generated per run and never reused.
- MFA, passkeys, social login and a complete design system remain deliberately outside Phase 1.
- OpenAPI remains enabled by default; reflective document generation is disabled only in CI E2E runtime because build and contract validation are separate gates.

## Phase 2 boundary

Phase 2 expands the design system, reusable interaction primitives, full accessibility regression coverage and i18n catalogs. The Phase 1 UI intentionally contains only the tokens and components needed for identity and tenant administration.

## Final-review corrections

- refresh-token concurrent reuse now revokes the complete session family; every session revocation also revokes active refresh records;
- invitation acceptance atomically claims the invitation and cannot reactivate suspended/revoked memberships;
- last-owner mutations serialize on the organization row;
- untrusted browser origins are rejected and cookie scope is explicit for preview/production;
- duplicate registration no longer confirms account existence; failed-login audit uses an irreversible e-mail fingerprint;
- audit derives the actor membership and propagates correlation/causation/trace identifiers;
- CI runs the API journey through a disposable `NOSUPERUSER NOBYPASSRLS` role and tests pooled RLS context cleanup;
- the worker now relays the transactional Outbox with PostgreSQL leases, BullMQ deduplication, retries, backoff and dead-event quarantine;
- administrative web pages now perform organization updates, invitations, role/status changes, team management, session revocation and password changes;
- table-driven RBAC, OpenAPI path parity, browser onboarding, cookie/logout/replay, cross-tenant team and Outbox concurrency regressions were added.

The definitive verdict, final commit, workflow and gate evidence will be recorded only after the corrected branch CI completes.
