# Local Recovery Runbook

1. Confirm `/health/live` before investigating providers.
2. Verify that `.env` references development or sandbox projects, never production.
3. Check the managed-provider status page and connection limits.
4. Validate API readiness at `/health/ready`; it reports unavailable when either dependency is missing.
5. Rotate a leaked development credential in the provider console and update the local secret only.
6. Never delete, reset or migrate a shared resource as a recovery shortcut.
