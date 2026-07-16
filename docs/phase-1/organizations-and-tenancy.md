# Organizations and tenancy

`User` is global. `Organization` is the tenant boundary. `Membership` is the explicit N:N relationship and carries status and role. A session may hold one active organization, and every tenant operation must match it. Selecting another organization rotates the access context after validating an active membership.

Controls are layered: tenant-aware identifiers and constraints, application authorization, repository queries scoped by `organizationId`, transaction-local PostgreSQL tenant settings, forced RLS policies, and cross-tenant tests. A resource addressed under another active tenant is returned as not found to reduce IDOR disclosure.

The last active owner cannot be suspended or revoked. Teams can contain only active memberships from the same organization. Tenant-owned uniqueness includes the tenant key where appropriate.

## Ownership matrix

| Entity                                               | Ownership                    | Tenant key                | Isolation                             |
| ---------------------------------------------------- | ---------------------------- | ------------------------- | ------------------------------------- |
| User, credential, session, verification/reset tokens | Global/user                  | No                        | authenticated user and hashed secrets |
| Organization                                         | Tenant root                  | `id`                      | active membership plus forced RLS     |
| Membership, invitation, role                         | Organization                 | `organizationId`          | composite constraints, policy and RLS |
| Team, team membership                                | Organization                 | `organizationId`          | tenant-aware foreign keys and RLS     |
| Audit log, outbox event                              | Organization when applicable | optional `organizationId` | scoped reads; append-only audit       |
| Permission catalog                                   | Global                       | No                        | authenticated role-read access        |
