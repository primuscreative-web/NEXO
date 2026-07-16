# Phase 1 final independent review

Date: 2026-07-16. Branch: `codex/phase-1-identity-organization`. Base: `d1256c3`.

## Initial verdict

The green workflow on commit `d72b2fc` was not sufficient for merge. Review found blocking Phase 1 gaps: the API E2E used a database superuser, refresh concurrency did not always revoke the family, invitations could reactivate suspended/revoked memberships, last-owner checks were not serialized, the Outbox had no relay, administrative UI was mostly read-only and browser/security regressions were incomplete.

## Corrections

The corrected implementation uses a restricted `NOSUPERUSER NOBYPASSRLS` API role in CI, transaction-local RLS with pool cleanup tests, atomic invitation claims, serialized owner mutations, complete refresh/session revocation, trusted-origin validation, explicit cookie scope, non-enumerating duplicate registration, safe audit fingerprints and actor/trace propagation. PostgreSQL remains the Outbox ledger; the worker leases with `SKIP LOCKED`, publishes idempotently to BullMQ, retries with backoff and quarantines poison events. Membership, team, session and audit collections are bounded cursor pages. The Phase 1 web surfaces now perform the required administration mutations.

Regression coverage includes the complete role/permission matrix, OpenAPI path parity, cookie attributes, logout, refresh replay, cross-tenant team references, suspended-membership invitation reuse, pooled RLS context, concurrent Outbox leasing and real browser onboarding.

## Residual risks

- API orchestration remains concentrated in `Phase1Service`; split by application use case before its next material expansion, without changing context boundaries.
- Organization discovery performs one tenant transaction per organization because RLS deliberately prevents cross-tenant joins. It is bounded operationally; add cursor pagination or a reviewed security-definer query if real users approach dozens of organizations.
- Unit coverage percentages for API/worker are diluted by framework bootstrap and generated surfaces; critical business branches are proven primarily by integration/E2E. Future refactoring should move more orchestration behind directly unit-testable application services.
- BullMQ delivery is at-least-once. Every future consumer must persist `eventId` idempotency before producing side effects.
- Production still requires separate migration, API and worker credentials, managed TLS, real mail delivery, backup/restore validation and operational alert routing.

## Merge rule

The final verdict is issued only after the corrected commit passes installation, formatting, lint, typecheck, unit, integration, E2E, coverage, build, dependency audit, secret scan, migrations, restricted-role RLS, cross-tenant, RBAC/ABAC and Outbox gates in GitHub Actions. No Phase 2 work is included.
