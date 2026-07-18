# Server state and tenant cache

Phase 2 retains the credentialed `apiFetch` client and adds a deliberately small cache with mandatory scope:

- `global` for the current user, organizations and sessions;
- `organization:<id>` for tenant-owned resources.

Tenant switches clear the previous organization and all shared client cache before reloading the session and navigating. Logout clears the entire cache before redirecting. Mutations invalidate cached data and refresh the shell where organization presentation may have changed. Access-token refresh remains centralized and bounded to one retry.

The cache is not an authorization boundary or a general global store. Phase 3 must re-evaluate a server-state library when inbox concurrency, optimistic writes and real-time reconciliation become concrete requirements.
