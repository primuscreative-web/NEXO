# NEXO Phase 1 report

Status: validation in progress. This report becomes final only after the published branch CI is green.

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

Final command results, coverage, migration status, commit SHAs, remote HEAD and workflow URL will be recorded after CI completion. Local provider-dependent tests explicitly skip when disposable `TEST_DATABASE_URL` and `TEST_REDIS_URL` are absent; they never fall back to development or production resources.

## Phase 2 boundary

Phase 2 expands the design system, reusable interaction primitives, full accessibility regression coverage and i18n catalogs. The Phase 1 UI intentionally contains only the tokens and components needed for identity and tenant administration.
