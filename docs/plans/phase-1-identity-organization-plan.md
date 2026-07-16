# NEXO — Phase 1 Technical Plan

**Branch:** `codex/phase-1-identity-organization`  
**Baseline:** `d1256c3`  
**Scope:** Identity, Organization, Platform/Audit and minimal Notification

## Normative review

The Constitution, Security Architecture, Foundation Architecture v2.1, Architecture Freeze Report, PRD, Database Architecture, API Specification, Testing Strategy, Implementation Plan and ADRs 003/005/008/010/011/012 were reviewed before code changes.

One historical conflict is material: Database Architecture v1.0 says `Organization 1:N Users`; Foundation Architecture v2.1 explicitly supersedes it with global `User N:N Organization` through `Membership`. The v2.1 model is authoritative.

## Decisions before implementation

- Identity remains NEXO-owned and provider-agnostic.
- Credential verification uses an Argon2id adapter; password/session rules stay in Identity.
- Access tokens are short-lived asymmetric JWTs; refresh tokens are opaque, hashed, rotating and family-scoped with reuse detection.
- Web tokens use HttpOnly cookies. SameSite, Secure, origin validation and CSRF tokens are applied according to request type.
- E-mail delivery is a Notification port with an in-memory test adapter; no real provider is required.
- RBAC uses a permission catalogue and role templates; ABAC is expressed as small explicit policies, not a generic policy engine.
- Transactional Outbox is the durable event ledger. BullMQ/Redis may relay work but is not authoritative.
- RLS is adopted for high-risk tenant-owned tables using transaction-local tenant context, `FORCE ROW LEVEL SECURITY`, `USING` and `WITH CHECK`. The application role must not own tables or have `BYPASSRLS`.
- Prisma records remain infrastructure types and are mapped to domain/application contracts.
- Feature flags remain deferred: no Phase 1 functional requirement needs persisted flags yet.

## Delivery sequence

1. Model entities, constraints, indexes, application role, RLS policies and immutable migration.
2. Add database client/transaction ports and repositories scoped by `TenantContext`.
3. Implement Identity domain/application services and cryptographic adapters.
4. Implement Organization aggregates, memberships, invitations, teams and authorization policies.
5. Implement append-only audit and transactional Outbox in Platform.
6. Add minimal Notification contract and in-memory e-mail capture adapter.
7. Compose `/v1` NestJS APIs, validation, OpenAPI, standard errors, pagination, cookies, CSRF and rate limits.
8. Build the authenticated Next.js interface and minimum semantic token/component layer.
9. Add unit, PostgreSQL/Redis integration, RLS/cross-tenant and E2E suites.
10. Complete runbooks, API documentation, matrices, changelog and phase report.

## Expected file areas

- `packages/contexts/identity/**`
- `packages/contexts/organization/**`
- `packages/contexts/platform/**`
- `packages/contexts/notification/**`
- `packages/auth/**` for technical cryptographic/session adapters only
- `packages/database/**` for Prisma schema, migration, client and transaction support
- `packages/events/**` for durable event contracts/relay primitives
- `apps/api/src/**` for composition and `/v1` interfaces
- `apps/worker/src/**` for Outbox relay composition
- `apps/web/src/app/**`, `apps/web/src/components/**`, `apps/web/src/lib/**`
- `tests/integration/**`, `tests/e2e/**`, per-context unit tests
- `docs/adr/**`, `docs/architecture/**`, `docs/security/**`, `docs/runbooks/**`, `docs/api/**`
- root/package/CI configuration only where required by the phase

## Risks and controls

| Risk                                | Impact   | Control                                                                                 |
| ----------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| cross-tenant disclosure/IDOR        | critical | tenant-derived context, scoped repositories, composite constraints, RLS, negative tests |
| refresh replay                      | critical | opaque rotation, hash storage, family revocation, reuse audit                           |
| account enumeration                 | high     | uniform responses, timing-resistant dummy verification, rate limits                     |
| last owner removal                  | high     | locked transaction and explicit ABAC policy                                             |
| privilege escalation                | critical | deny-by-default permission catalogue, protected roles, before/after audit               |
| RLS context leakage through pooling | critical | transaction-local `set_config`, no session-global tenant state, pooling tests           |
| lost integration event              | high     | business mutation and Outbox row in one transaction                                     |
| PII/token leakage                   | critical | field classification, redaction, token hashing, safe audit metadata                     |
| excessive Phase 2 design work       | medium   | only minimum semantic tokens/components required by functional flows                    |

## Acceptance strategy

Critical business rules target at least 95% branch coverage; remaining domain rules target at least 90%. Integration runs only against disposable `TEST_*` infrastructure. E2E proves UI, API and persistence for the required flows. No phase completion is allowed with a failing required gate.
