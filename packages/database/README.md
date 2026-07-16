# @nexo/database

Technical PostgreSQL and Prisma foundation. Phase 0 intentionally contains no business model.

Rules:

- migrations are immutable after publication;
- every future table has a bounded-context owner;
- Prisma records are persistence models, not domain entities;
- raw SQL requires parameterization, tests, and justification;
- tenant-owned constraints are designed with `organizationId` from Phase 1 onward.
