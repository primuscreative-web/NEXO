# Runbook: invitations

1. Confirm the actor has `membership.invite` in the active organization.
2. Invitations expire, store only a token hash and are delivered through the replaceable email port.
3. Re-send invalidates the prior token and is rate limited. Revocation makes acceptance impossible.
4. Acceptance requires the authenticated email to match and is idempotent against duplicate use.
5. For a delivery incident, inspect audit and outbox state by correlation ID; never paste the raw invitation token into logs.

Automated tests use the in-memory email adapter. Production must configure a real adapter before external invitations are enabled.
