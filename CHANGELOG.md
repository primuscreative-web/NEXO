# Changelog

All notable project changes follow Keep a Changelog and Conventional Commits.

## Unreleased

### Added

- Phase 0 monorepo foundation.
- Web, API, Worker, and Webhook Gateway shells.
- PostgreSQL, Prisma, Redis, Docker Compose, health checks, tests, CI, and architecture records.
- Phase 1 owned authentication with Argon2id, short-lived EdDSA access tokens, rotating refresh-token families, email verification, password recovery and session revocation.
- Multi-organization memberships, invitations, teams, system roles, granular permissions, scoped ABAC policies and active-tenant enforcement.
- PostgreSQL RLS defense in depth, append-only audit records, transactional outbox records and Phase 1 web management surfaces.
- Nexus Precision design system package with semantic tokens, light/dark/system themes, typed variants and an executable UI Lab.
- Responsive authenticated shell, centralized navigation, breadcrumbs, command palette, organization switcher and explicit placeholders for future phases.
- Typed pt-BR catalog, centralized timezone-aware formatting and tenant-scoped frontend cache invalidation.
- Component, WCAG 2.2 AA, visual regression and frontend bundle-budget quality gates.
- Preview-only, access-key-protected password-reset capture for synthetic end-to-end validation.

### Fixed

- Preview authentication now tolerates Render cold starts, normalizes network and timeout failures, and never exposes raw `Failed to fetch` messages.
- Tenant transactions allow bounded remote-database wait and execution windows so first-organization onboarding remains reliable on managed Preview infrastructure.
