# Phase 2 — Design System and Application Shell Plan

**Status:** Approved for execution  
**Branch:** `codex/phase-2-design-system-shell`  
**Baseline:** `eef0f4e119d2c759e499d5510491d3ec1bbaa751`  
**Date:** 2026-07-16

## Objective

Deliver the definitive visual and structural frontend foundation without implementing Phase 3 business capabilities. The work preserves Phase 1 authentication, tenancy, authorization and API contracts while replacing its provisional presentation layer with reusable, accessible primitives.

## Normative inputs reviewed

- Constitution, Foundation Architecture v2.1, Security Architecture and Testing Strategy.
- PRD, System Architecture, Codex Implementation Plan and Architecture Freeze Report.
- Phase 0 foundation report, Phase 1 implementation report and Phase 1 final review.
- Existing Web application, API contracts, permission catalog, E2E journeys and CI workflow.
- Stitch exports for enterprise dashboard, multi-company settings, organization map and mobile variants.

Stitch is a visual reference only. Its static HTML, CDN Tailwind configuration, fictional data and inaccessible interactions are not production inputs.

## Audit findings

1. Phase 1 is functionally complete, but its frontend is a provisional single stylesheet with duplicated native controls and no formal component package.
2. The current theme toggle is session-only, has no system preference and can flash the wrong theme during hydration.
3. Navigation is local to the shell, string-based and limited to `/app/*` routes.
4. Server data access is uncached, has no tenant-scoped invalidation contract and does not clear a shared client state explicitly on organization changes.
5. The organizations API exposes the current role, but not its permission keys. A backward-compatible response extension is required for permission-aware presentation; backend authorization remains authoritative.
6. Existing Phase 1 E2E journeys must remain green and receive compatibility redirects while canonical authenticated routes move to the approved Phase 2 route map.
7. No formal accessibility target had been frozen. Phase 2 adopts WCAG 2.2 AA as the engineering target.

## Implementation slices

### 1. UI package and tokens

- Create `packages/ui` as a dependency-safe package with public exports only.
- Implement primitive, semantic and component tokens for light and dark themes.
- Add typed variants and accessible primitives for forms, overlays, navigation, data display, feedback and states.
- Use Radix primitives for behavior-heavy controls and Lucide for a single tree-shakeable icon language.
- Provide an in-product UI Lab as the low-overhead component documentation surface.

### 2. Theme, i18n and formatting

- Add light, dark and system preferences with local persistence and a pre-hydration theme script.
- Centralize the `pt-BR` catalog by namespaces and typed translation keys.
- Centralize dates, time, numbers and currency, using organization timezone first and browser timezone as the documented fallback.

### 3. Authenticated shell and navigation

- Implement skip link, landmarks, responsive sidebar/drawer, topbar, breadcrumbs, organization switcher, user menu, command palette and toast/live regions.
- Centralize typed route metadata, feature status, permission requirements and mobile visibility.
- Preserve `/app/*` URLs as redirects to canonical routes.
- Mark future modules explicitly as unavailable and identify their planned phase; never render invented metrics.

### 4. Phase 1 visual integration

- Migrate login, registration, recovery, verification and settings surfaces to UI primitives.
- Keep cookies, CSRF, refresh behavior and API mutations unchanged.
- Extend organization-list role data with permission keys so the client can present allowed commands and routes; all APIs continue enforcing permissions independently.

### 5. Client data and tenant isolation

- Introduce one small organization-scoped cache contract around the existing API client.
- Partition cache keys by organization and clear all client state on tenant switch and logout.
- Keep retry behavior bounded and preserve the existing refresh-session path.

### 6. Verification and documentation

- Unit tests for tokens, variants, navigation, breadcrumbs, permissions, theme, i18n, formatting and tenant cache.
- Component tests with Testing Library in jsdom for keyboard/focus interactions and core UI states.
- Playwright accessibility checks with axe on critical pages.
- Preserve Phase 1 E2E and add shell, theme, tenant switch, keyboard, mobile and logout coverage.
- Add stable visual snapshots for UI Lab, login and shell in light/dark and desktop/mobile.
- Add deterministic JavaScript/CSS bundle budgets and CI gates.

## Expected file areas

- `packages/ui/**`
- `apps/web/src/app/**`
- `apps/web/src/components/**`
- `apps/web/src/lib/**`
- `apps/web/test/**`
- `apps/api/src/phase1/**` and its regression tests for the compatible permission projection
- `tests/e2e/**`, Playwright and Vitest configurations
- `.github/workflows/ci.yml`, root scripts and lockfile
- `docs/adr/**`, `docs/design-system/**`, `docs/frontend/**`, Phase 2 report, README and changelog

Published migrations and Phase 1 database ownership rules are not modified.

## Risks and controls

| Risk                                                | Control                                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Visual refactor breaks Phase 1 flows                | Preserve API contracts, keep compatibility redirects and run all Phase 1 E2E journeys                                           |
| Permission hiding is mistaken for authorization     | Backend remains authoritative; the client consumes permissions only for presentation                                            |
| Tenant data remains visible after a switch          | Organization-partitioned keys, explicit cache reset and E2E regression                                                          |
| Overlay primitives regress focus or keyboard access | Radix behavior primitives, component tests and axe checks                                                                       |
| Theme causes hydration flash                        | Inline pre-hydration resolver, CSS tokens and system-change listener                                                            |
| Component package increases bundle cost             | Importable public modules, tree-shakeable icons, lazy command palette and enforced budgets                                      |
| Visual snapshots become brittle                     | Snapshot only stable states, freeze animations/fonts and document conscious updates                                             |
| CI becomes excessively slow                         | Reuse a single production build and browser installation; split deterministic UI gates without duplicating infrastructure setup |

## Acceptance

Phase 2 is complete only when all requested functional surfaces, documentation and real repository commands pass locally and on the draft PR. No merge to `main` and no Phase 3 functionality are authorized in this plan.
