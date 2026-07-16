# Roles and permissions

Authorization is deny-by-default. System role templates are created per organization and cannot be silently treated as global grants.

| Role       | Intended scope                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| Owner      | all Phase 1 organization administration, roles and audit                                                      |
| Admin      | organization, memberships, invitations, teams, sessions and audit; critical role management remains protected |
| Supervisor | read organization/members and manage teams in the current organization                                        |
| Agent      | read organization and teams                                                                                   |
| Analyst    | read organization, members and audit where explicitly granted                                                 |
| Developer  | read organization and teams                                                                                   |
| Finance    | organization read only in Phase 1                                                                             |

The canonical catalog lives in `packages/contexts/organization/src/index.ts` and includes `organization.*`, `membership.*`, `team.*`, `role.*`, `audit.read` and session permissions. ABAC policies add active organization, active membership, organization status, tenant equality and last-owner invariants. UI permission checks are convenience only; the API always decides.
