# Migration Runbook

- Create migrations only with a documented bounded-context owner.
- Never edit a migration after publication.
- Use expand/contract for incompatible changes.
- Apply `pnpm prisma:validate` and test against a clean database.
- Production destructive changes require backup evidence, rollback/forward-fix plan, and explicit review.
- Phase 0 contains only the `pgcrypto` foundation migration.
