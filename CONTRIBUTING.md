# Contributing to NEXO

1. Read the Constitution, Foundation Architecture v2.1, and ADR index.
2. Work on a scoped branch and use Conventional Commits.
3. Import other modules only through public exports.
4. Validate external data at runtime; TypeScript types are not validation.
5. Add tests and documentation in the same change.
6. Run `pnpm validate` before requesting review.

Architectural, tenancy, public contract, database ownership, or security changes require a new ADR or an explicit revision of an accepted ADR before implementation.

Generated persistence types are not domain entities. Business logic must not be placed in controllers, ORM models, provider adapters, or SDK wrappers.
