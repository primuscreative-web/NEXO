# Dependency Rules

1. Applications are composition roots and never import another application.
2. Future Bounded Contexts live at `packages/contexts/<context>` and expose explicit public entrypoints.
3. Context internals, repositories, Prisma records, and infrastructure adapters are private.
4. Domain code imports no NestJS, Prisma, BullMQ, provider SDK, or transport type.
5. Cross-context communication uses public application contracts or versioned integration events.
6. `shared` contains no business rule.
7. Cycles are forbidden.
8. Packages are created when a real consumer exists, not to mirror the architecture diagram.
9. PostgreSQL, Redis and object storage are accessed through ports; provider adapters are infrastructure details.
10. Tests may use in-memory adapters or disposable infrastructure, never production credentials or customer data.
