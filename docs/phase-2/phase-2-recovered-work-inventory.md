# Phase 2 — Recovered Work Inventory

**Date:** 2026-07-17  
**Branch:** `codex/phase-2-design-system-shell`  
**Baseline commit:** `eef0f4e119d2c759e499d5510491d3ec1bbaa751`  
**Status at recovery:** All work unstaged and untracked — no commits yet on this branch.

---

## 1. Context

The Antigravity IDE was restarted with a context prompt describing Phase 2 as "not started". The actual repository state differed: significant Phase 2 implementation already existed locally on the correct branch, created from the correct baseline, but no commit had been made. This document inventories that work, describes its purpose, and records the risks and actions taken before the first safe commit.

---

## 2. Files that already existed (unmodified by Phase 2)

These files were present from Phase 0 and Phase 1 (on `main`) and were not changed by Phase 2 work:

- All `apps/api/` source except `apps/api/src/phase1/phase1.service.ts`
- All `apps/worker/`, `apps/webhook-gateway/` source
- All `packages/auth/`, `packages/cache/`, `packages/config/`, `packages/contexts/`, `packages/database/`, `packages/events/`, `packages/observability/`, `packages/shared/`, `packages/storage/`, `packages/testing/`
- `tests/e2e/`, `tests/integration/`
- `.github/workflows/`, infrastructure, tooling
- All Phase 0/1 documentation under `docs/phase-1/`, `docs/security/`, `docs/architecture/`

---

## 3. Modified files (existed in Phase 1, changed by Phase 2)

| File                                                 | Change description                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/phase1/phase1.service.ts`              | Backward-compatible extension: organization-list endpoint now returns `permissions` array alongside role key and name. Needed by frontend to present permission-aware UI without trusting the client for authorization.                                                                                    |
| `apps/web/next.config.ts`                            | Added `transpilePackages: ['@nexo/ui']`, CSP headers, turbopack workspace root config, security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).                                                                                                                    |
| `apps/web/package.json`                              | Added dev dependencies: `@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event`, `@types/react`, `@types/react-dom`, `@vitest/coverage-v8`, `jsdom`.                                                                                                                          |
| `apps/web/src/app/access-denied/page.tsx`            | Migrated to `@nexo/ui` primitives (`PageState`/`PermissionState`).                                                                                                                                                                                                                                         |
| `apps/web/src/app/app/audit/page.tsx`                | Now a redirect stub: `redirect('/settings/audit')`.                                                                                                                                                                                                                                                        |
| `apps/web/src/app/app/layout.tsx`                    | Simplified: passes children through (shell moved to `/(platform)/layout.tsx`).                                                                                                                                                                                                                             |
| `apps/web/src/app/app/members/page.tsx`              | Redirect stub → `/settings/members`.                                                                                                                                                                                                                                                                       |
| `apps/web/src/app/app/organization/page.tsx`         | Redirect stub → `/settings/organization`.                                                                                                                                                                                                                                                                  |
| `apps/web/src/app/app/page.tsx`                      | Redirect stub → `/dashboard`.                                                                                                                                                                                                                                                                              |
| `apps/web/src/app/app/profile/page.tsx`              | Redirect stub → `/settings/profile`.                                                                                                                                                                                                                                                                       |
| `apps/web/src/app/app/roles/page.tsx`                | Redirect stub → `/settings/roles`.                                                                                                                                                                                                                                                                         |
| `apps/web/src/app/app/sessions/page.tsx`             | Redirect stub → `/settings/sessions`.                                                                                                                                                                                                                                                                      |
| `apps/web/src/app/app/teams/page.tsx`                | Redirect stub → `/team`.                                                                                                                                                                                                                                                                                   |
| `apps/web/src/app/layout.tsx`                        | Now imports `@nexo/ui/styles.css`, adds `themeBootstrapScript` inline, wraps in `ThemeProvider`.                                                                                                                                                                                                           |
| `apps/web/src/app/organization-unavailable/page.tsx` | Migrated to `@nexo/ui` primitives.                                                                                                                                                                                                                                                                         |
| `apps/web/src/app/styles.css`                        | Substantially expanded: page layout utilities, shell utilities, auth surfaces, stat grid, dashboard layout, etc. — all using `@nexo/ui` tokens.                                                                                                                                                            |
| `apps/web/src/components/app-shell.tsx`              | Completely rewritten: skip link, `SessionProvider`, responsive sidebar, mobile drawer/overlay, topbar, breadcrumbs, `OrganizationSwitcher`, `CommandPalette`, `UserMenu`, `ThemeToggle`, toast region, permission state guard, sidebar collapse with localStorage persistence, keyboard shortcut `Ctrl+K`. |
| `apps/web/src/components/auth-form.tsx`              | Migrated from raw HTML to `@nexo/ui` primitives (`Card`, `FormField`, `Input`, `PasswordInput`, `Button`, `Alert`). Redirects after login now target `/dashboard` (canonical route).                                                                                                                       |
| `apps/web/src/components/organization-dashboard.tsx` | Migrated to `@nexo/ui` primitives with real data notice.                                                                                                                                                                                                                                                   |
| `apps/web/src/components/theme-toggle.tsx`           | Rewritten: cycles system→light→dark, uses `useTheme()`, has `data-testid` for component tests.                                                                                                                                                                                                             |
| `apps/web/src/lib/api.ts`                            | Added CSRF token extraction from cookies, retry on 401 with refresh, safe redirect to `/login?expired=1` on double 401.                                                                                                                                                                                    |
| `apps/web/src/proxy.ts`                              | Minor update (review needed).                                                                                                                                                                                                                                                                              |
| `docs/adr/README.md`                                 | Added entries for ADR-015 and ADR-016.                                                                                                                                                                                                                                                                     |
| `package.json`                                       | Added `@axe-core/playwright`, `test:a11y`, `test:components`, `test:visual`, `test:visual:update`, `bundle:check` scripts. Added root dev dependencies.                                                                                                                                                    |
| `pnpm-lock.yaml`                                     | Updated for all new dependencies.                                                                                                                                                                                                                                                                          |
| `turbo.json`                                         | Added `test:components` pipeline task.                                                                                                                                                                                                                                                                     |

---

## 4. New files (untracked by Phase 2)

### 4.1 `packages/ui/` — `@nexo/ui` Design System Package

| File                       | Purpose                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/tokens.css`           | Three-layer CSS custom property token system: primitive palette → semantic aliases → component tokens. Full light/dark/reduced-motion support.                                                                                                                                                                             |
| `src/styles.css`           | CSS `@layer` stylesheet: base reset, focus ring, visually-hidden, all component classes (button variants, inputs, form fields, overlays, navigation, tables, badges, skeletons, etc.).                                                                                                                                     |
| `src/lib.ts`               | `cn()` (clsx wrapper) and `initials()` utility.                                                                                                                                                                                                                                                                            |
| `src/button.tsx`           | `Button` and `IconButton` with CVA variants (primary, secondary, ghost, outline, destructive × sm/md/lg), loading state, aria-busy, forwardRef-compatible.                                                                                                                                                                 |
| `src/forms.tsx`            | `Input`, `Textarea`, `Label`, `FormField` (with accessible IDs), `PasswordInput`, `SearchInput`, `DateInput`, `NativeSelect`, `Select` (Radix), `Combobox`, `Checkbox` (Radix), `RadioGroup` (Radix), `Switch` (Radix), `describedBy` helper, `useFilteredOptions` hook. All use `forwardRef` where DOM refs are expected. |
| `src/overlays.tsx`         | `Tooltip`, `Popover`, `DropdownMenu`, `ContextMenu`, `Dialog`, `ConfirmationDialog`, `Drawer`, `Sheet`, `ScrollArea` — all backed by Radix UI primitives.                                                                                                                                                                  |
| `src/navigation.tsx`       | `Breadcrumb`, `Tabs` (Radix), `Accordion` (Radix), `Pagination`, `KeyboardShortcut`, `NavigationItem`.                                                                                                                                                                                                                     |
| `src/display.tsx`          | `Card`, `StatCard`, `Badge` (CVA tones), `Alert`, `Avatar`, `Separator`, `Table`, `DataTable` (generic typed), `StatusIndicator`, `Timeline`, `PageState`, `EmptyState`, `ErrorState`, `PermissionState`.                                                                                                                  |
| `src/feedback.tsx`         | `Skeleton`, `Spinner`, `Progress`, `LoadingPage`, `ToastRegion`, `Toast`.                                                                                                                                                                                                                                                  |
| `src/menus.tsx`            | `UserMenu`, `OrganizationSwitcher`, `SelectableMenuLabel`.                                                                                                                                                                                                                                                                 |
| `src/command.tsx`          | `CommandPalette`: keyboard-driven (↑↓ Enter), group display, fuzzy text search, Radix Dialog backdrop, accessible combobox+listbox ARIA.                                                                                                                                                                                   |
| `src/index.ts`             | Central barrel export for all components.                                                                                                                                                                                                                                                                                  |
| `package.json`             | Package manifest: name `@nexo/ui`, dependencies (CVA, clsx, lucide-react, radix-ui), devDependencies (Testing Library, jsdom, tsup, vitest).                                                                                                                                                                               |
| `tsconfig.json`            | TypeScript config for the package.                                                                                                                                                                                                                                                                                         |
| `vitest.config.ts`         | Vitest config for unit + component tests.                                                                                                                                                                                                                                                                                  |
| `test/setup.ts`            | jsdom setup: ResizeObserver mock, PointerEvent, scrollIntoView, pointer capture stubs.                                                                                                                                                                                                                                     |
| `test/tokens.test.ts`      | Token contract tests: verifies CSS custom properties exist as expected strings.                                                                                                                                                                                                                                            |
| `test/variants.test.ts`    | CVA variant class generation tests for Button and Badge.                                                                                                                                                                                                                                                                   |
| `test/components.test.tsx` | Component interaction tests: Button loading/disabled, FormField accessible IDs, Dialog open/close keyboard, CommandPalette filter.                                                                                                                                                                                         |

### 4.2 `apps/web/src/lib/` — New libraries

| File              | Purpose                                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `i18n.ts`         | Typed pt-BR catalog (77 keys across 11 namespaces), `t()` with interpolation, `plural()` with Intl.PluralRules.                                                       |
| `navigation.tsx`  | `RouteMetadata` type, `routes[]` array with feature status, planned phase, icon, permissions, breadcrumbs. `currentRoute()`, `breadcrumbsFor()`, `routeAllowed()`.    |
| `tenant-cache.ts` | `TenantQueryCache`: Map-backed promise cache keyed by `{global                                                                                                        | organization:id}:resource`, TTL 30 s default, `invalidate()`, `clearOrganization()`, `clearAll()`, generation counter for change detection. |
| `theme.ts`        | `ThemePreference`, `ResolvedTheme`, `resolveTheme()`, `isThemePreference()`, `themeBootstrapScript` (inline script for pre-hydration theme resolution without flash). |
| `format.ts`       | `FormatContext`, `resolveTimezone()` (org → user → browser), `formatDateTime()`, `formatDate()`, `formatNumber()`, `formatCurrency()` — all via `Intl` APIs.          |

### 4.3 `apps/web/src/components/` — New components

| File                     | Purpose                                                                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `session-context.tsx`    | `SessionProvider` + `useSession()`: loads `/v1/auth/me` and `/v1/organizations`, derives `activeOrganization` and `permissions`, `selectOrganization()` clears tenant cache, `logout()` always clears cache and redirects even on network error. |
| `theme-provider.tsx`     | `ThemeProvider` + `useTheme()`: reads stored preference, listens to `prefers-color-scheme`, applies `data-theme` attribute.                                                                                                                      |
| `dashboard.tsx`          | Real data dashboard: fetches memberships, teams, sessions, audit counts with `TenantQueryCache` scoped per organization. Permission-gated stat cards. No fictional data.                                                                         |
| `future-module-page.tsx` | Honest placeholder for planned routes: shows phase number and explicit "not available" message. Zero mock data.                                                                                                                                  |
| `system-page.tsx`        | Generic system error/state page.                                                                                                                                                                                                                 |
| `ui-lab.tsx`             | In-product component catalog: renders all UI primitives with variants, states, and accessibility notes.                                                                                                                                          |

### 4.4 `apps/web/src/app/` — New routes

| Path                                         | Purpose                                         |
| -------------------------------------------- | ----------------------------------------------- |
| `(platform)/layout.tsx`                      | Wraps all authenticated routes in `<AppShell>`. |
| `(platform)/dashboard/page.tsx`              | Real dashboard page.                            |
| `(platform)/inbox/page.tsx`                  | Honest placeholder → Phase 3.                   |
| `(platform)/crm/page.tsx`                    | Honest placeholder → Phase 7 (CRM).             |
| `(platform)/ai/page.tsx`                     | Honest placeholder → Phase 5.                   |
| `(platform)/workflows/page.tsx`              | Honest placeholder → Phase 8.                   |
| `(platform)/knowledge/page.tsx`              | Honest placeholder → Phase 5.                   |
| `(platform)/analytics/page.tsx`              | Honest placeholder → Phase 9.                   |
| `(platform)/integrations/page.tsx`           | Honest placeholder → Phase 4.                   |
| `(platform)/team/page.tsx`                   | Real team page (Phase 1 data).                  |
| `(platform)/settings/page.tsx`               | Settings index.                                 |
| `(platform)/settings/profile/page.tsx`       | Real profile page.                              |
| `(platform)/settings/organization/page.tsx`  | Real organization settings.                     |
| `(platform)/settings/members/page.tsx`       | Real members & invitations.                     |
| `(platform)/settings/roles/page.tsx`         | Real roles & permissions.                       |
| `(platform)/settings/sessions/page.tsx`      | Real sessions management.                       |
| `(platform)/settings/audit/page.tsx`         | Real audit log.                                 |
| `(platform)/settings/design-system/page.tsx` | UI Lab route (internal).                        |
| `error.tsx`                                  | Root error boundary.                            |
| `not-found.tsx`                              | 404 page.                                       |
| `invitation-expired/`                        | System page for expired invitations.            |
| `invitation-invalid/`                        | System page for invalid invitations.            |
| `maintenance/`                               | Maintenance mode page.                          |
| `no-organizations/`                          | Onboarding state for users with no orgs.        |
| `session-expired/`                           | Session expiry landing.                         |

### 4.5 `apps/web/test/` — New tests

| File                          | Purpose                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `foundation.test.ts`          | Unit tests: navigation, i18n, tenant cache isolation, theme resolution, formatting.            |
| `shell.component.test.tsx`    | Component tests: shell landmarks, command palette keyboard, mobile sidebar, theme persistence. |
| `setup-components.ts`         | jsdom setup for web app component tests.                                                       |
| `vitest.config.ts`            | Node vitest config (unit tests, excludes component tests).                                     |
| `vitest.components.config.ts` | jsdom vitest config for component tests.                                                       |

### 4.6 Documentation

| File                                                       | Purpose                                                                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `docs/adr/015-frontend-design-system-and-accessibility.md` | ADR: `@nexo/ui` with Radix + Lucide + CSS tokens, WCAG 2.2 AA target, UI Lab over Storybook for Phase 2. Status: Accepted. |
| `docs/adr/016-frontend-tenant-cache-and-i18n.md`           | ADR: small organization-scoped cache contract, typed pt-BR catalogs. Status: Accepted.                                     |
| `docs/plans/phase-2-design-system-shell-plan.md`           | Approved execution plan with 6 slices, risk table, acceptance criteria.                                                    |

---

## 5. Security verification

| Check                                   | Result                                                                                                         |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Secrets in new files                    | ✅ None found                                                                                                  |
| Tokens in localStorage                  | ✅ Only `nexo-theme` (theme preference) and `nexo-sidebar-collapsed` (UI state) stored                         |
| Auth cookies handled in frontend        | ✅ Cookies are HttpOnly, read only for CSRF token — no session token exposure                                  |
| Client-side authorization               | ✅ Permission checks are presentation-only; backend remains authoritative                                      |
| Tenant data on org switch               | ✅ `selectOrganization()` calls `tenantQueryCache.clearOrganization(previous)` then `clearAll()` before reload |
| Cache on logout                         | ✅ `logout()` calls `tenantQueryCache.clearAll()` in `finally` block — runs even on network error              |
| Fictional data presented as real        | ✅ None — `FutureModulePage` is explicitly marked, dashboard uses real API data                                |
| `.env` files staged                     | ✅ Not staged — `.gitignore` covers `.env*`                                                                    |
| Generated artifacts (`.next/`, `dist/`) | ✅ Not tracked — covered by `.gitignore`                                                                       |

---

## 6. Issues found and corrected before first commit

| Issue                                   | File                        | Fix                                                                                              |
| --------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| Format: 44 files not Prettier-compliant | Multiple                    | Ran `pnpm format` — all fixed automatically                                                      |
| Lint: 3 `no-empty-function` errors      | `packages/ui/test/setup.ts` | Added `eslint-disable-next-line` comments — stubs are intentional jsdom mocks for ResizeObserver |

---

## 7. Validation status at first commit

| Gate                             | Status                                |
| -------------------------------- | ------------------------------------- |
| `pnpm install --frozen-lockfile` | ✅ Pass                               |
| `pnpm format:check`              | ✅ Pass (after `pnpm format` run)     |
| `pnpm lint`                      | ⏳ Re-running after fix               |
| `pnpm typecheck`                 | ⏳ Pending                            |
| `pnpm test:unit`                 | ⏳ Pending                            |
| `pnpm test:components`           | ⏳ Pending                            |
| `pnpm build`                     | ⏳ Pending                            |
| `pnpm test:e2e`                  | ⏳ Pending (requires running backend) |

---

## 8. Files excluded from commit (intentionally)

| Pattern                               | Reason                             |
| ------------------------------------- | ---------------------------------- |
| `.next/`                              | Next.js build output — gitignored  |
| `packages/ui/dist/`                   | tsup build output — gitignored     |
| `node_modules/`                       | Dependencies — gitignored          |
| `*.log`                               | Log files — gitignored             |
| `.env`, `.env.*`                      | Environment variables — gitignored |
| `playwright-report/`, `test-results/` | Test artifacts — gitignored        |

---

## 9. Relationship to Phase 1

Phase 2 strictly extends Phase 1 without modifying its core guarantees:

- **Authentication**: unchanged. Cookies, CSRF, refresh tokens, session management all intact.
- **API contracts**: the only backend change is an additive field (`permissions[]`) on the organizations list response — backward-compatible.
- **RLS and RBAC**: not modified. Permission checks in frontend are presentation-only.
- **Outbox and audit**: not modified.
- **Database migrations**: none added in Phase 2.
- **Legacy routes** (`/app/*`): preserved as redirect stubs to canonical Phase 2 routes, maintaining E2E test compatibility.
