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

## Findings closed during the final validation

The independent validation exposed and closed four additional product defects before approval:

1. identity audit insertion used `INSERT ... RETURNING`, which correctly failed the audit read policy before an authenticated user context existed; append-only writes now use a non-returning insert and retain restrictive RLS reads;
2. the CI runner did not provision the Playwright Chromium binary, and serial stateful journeys were retried into secondary rate-limit failures; the browser is now explicitly installed and stateful E2E runs without misleading whole-journey retries;
3. organization onboarding submitted an empty optional slug and later dereferenced a React form event after asynchronous work; blank slugs are omitted/normalized defensively and the form reference is retained safely;
4. the web API client declared JSON for bodyless mutations, causing Fastify to reject organization selection; content type is now attached only when a body exists, with unit regression coverage.

The final documentation run also exposed a test-isolation defect: the Outbox concurrency regression assumed the durable ledger was empty after E2E. It now proves the actual invariant—that the target event is leased at most once—even when unrelated pending events legitimately coexist.

No published migration was edited. The corrective migrations added by the review are `20260716213000_audit_identity_insert_policy` and `20260716214500_outbox_idempotency_contract`.

## Final evidence and verdict

- Validated implementation commit: `a72e2b2b43882370e378f339e77596d90749f413`.
- GitHub Actions run: <https://github.com/primuscreative-web/NEXO/actions/runs/29536164420>.
- `quality`: passed, including frozen install, Prisma validation/generation/migration deployment, restricted application role, build, real-browser E2E, formatting, lint, strict typecheck, unit tests, PostgreSQL/Redis integration tests, coverage and dependency audit.
- `secrets`: passed with Gitleaks over full history.
- PR remained mergeable and the branch contained no divergence from `main` at the validation point.

## APPROVED FOR MERGE WITH ACCEPTED RISKS

There are no known critical or high Phase 1 defects and no mandatory gate is failing. The residual risks listed above are accepted because they are bounded, documented and do not invalidate the Phase 1 security or tenancy baseline. The merge must still use the repository's squash policy and the resulting `main` workflow must pass before Phase 1 is declared closed.
