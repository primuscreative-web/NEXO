# ADR-016 — Frontend Tenant Cache and Internationalization

**Status:** Accepted

## Context

The authenticated Web surface operates across multiple organizations. Phase 1 uses direct uncached fetches and Portuguese strings embedded in components. Phase 2 requires tenant-safe cache behavior, centralized localization and predictable session-expiration handling without adding business functionality.

## Problem

A generic browser cache can display data from the previously active tenant after an organization switch. Introducing multiple data libraries or a large generic state framework would be disproportionate to the current number of server resources. Embedded visible strings and direct `toLocaleString` calls also prevent consistent locale, pluralization and organization-timezone behavior.

## Alternatives evaluated

- Continue with uncached direct requests and rely on page reloads.
- Introduce a full server-state library and migrate every Phase 1 form at once.
- Add a small cache contract around the existing API client, partitioned by organization.
- Use an external internationalization runtime immediately.
- Use typed local catalogs and centralized `Intl` formatters until runtime locale switching is required.

## Decision

Add one frontend server-state boundary around the existing credentialed API client. Cacheable reads require an explicit scope: global user or organization ID. Tenant changes and logout synchronously clear cached data and abort or invalidate obsolete work before navigation. Mutation helpers invalidate named resources; authentication refresh remains centralized in the existing API client. Authorization remains on the server.

Use typed, namespace-based catalogs with `pt-BR` as the initial locale. Translation supports interpolation and plural selection; shared `Intl` formatters cover dates, times, numbers and currency. Organization timezone takes precedence, followed by the user's timezone and finally the browser-resolved timezone. Technical identifiers and permission keys are not translated.

Re-evaluate a dedicated server-state library when Phase 3 introduces high-frequency inbox data, optimistic updates or coordinated real-time cache reconciliation. Re-evaluate an external i18n runtime when a second locale and runtime language switching enter an approved product phase.

## Consequences

The current frontend gains explicit tenant isolation without a broad framework migration. The cache is intentionally small and must not evolve into an undocumented global store. Typed catalogs remove scattered system text but require build-time completeness checks. Deferred libraries avoid premature complexity while leaving clear adoption triggers.
