# Runbook: sessions

1. Identify the user and correlation ID without copying access or refresh tokens into tickets or logs.
2. Use the authenticated session list to confirm creation time, last use, IP summary and user agent.
3. Revoke a suspected session; for compromise, revoke all other sessions and change the password.
4. A refresh-token reuse signal requires revoking its complete family and reviewing nearby audit events.
5. Never restore a revoked token. Require a new login and, when appropriate, password reset.

Operational evidence is in `platform_audit_logs`; secrets and full tokens are prohibited from metadata.
