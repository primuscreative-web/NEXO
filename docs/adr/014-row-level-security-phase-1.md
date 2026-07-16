# ADR-014 — Row-Level Security for Phase 1 Tenant Data

**Status:** Accepted

## Context

Foundation v2.1 requires a Phase 1 RLS spike covering Prisma, pooling, migrations, administrative operations and performance. Identity is global; Organization children, roles, teams, invitations and audit records are tenant-owned.

## Problem

Application filtering alone can leak data through a missing predicate or IDOR. RLS can add database enforcement, but session-level tenant variables can leak between pooled requests, owners/superusers bypass policies and recursive membership policies can become unsafe or slow.

## Alternatives evaluated

Application filters only; RLS on every table; RLS only on high-risk tenant-owned tables; schema/database per tenant.

## Decision

Adopt RLS on Phase 1 tenant-owned tables while retaining application authorization and composite constraints. Repository methods require `TenantContext`. Each tenant transaction sets `app.current_organization_id` with transaction-local `set_config`; no request uses session-global `SET`. Policies compare indexed `organizationId` columns and apply both `USING` and `WITH CHECK`. Tables use `FORCE ROW LEVEL SECURITY`.

The runtime database role must be distinct from the migration owner, must not own protected tables and must not have `BYPASSRLS`. CI creates/tests this role. Managed development environments use separate runtime and migration connection strings when supported. Global Identity tables are not protected by tenant RLS. Membership discovery for the authenticated user is exposed through a narrowly scoped repository path and does not trust client-supplied tenant IDs.

## Consequences

RLS provides defense in depth and default-deny behavior, including against accidental unscoped queries. All tenant repository work must remain inside a transaction, which has pooling and latency cost. Administrative/support access requires an explicit, audited path and cannot silently reuse a bypass role. Reassess policy performance with `EXPLAIN`, production-like volume and pooling before Phase 3.
