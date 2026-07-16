# Phase 1 Threat Model

## Assets

Credentials, signing keys, sessions, organization membership, roles/permissions, invitations, tenant data, audit trail and Outbox integrity.

## Trust boundaries

Browser → Web/API; API → PostgreSQL/Redis; API → e-mail adapter; worker → Outbox/transport; migration owner → runtime role; authenticated user → selected organization.

## Principal threats and controls

| Threat                          | Control                                                                           | Residual risk                                        |
| ------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| credential stuffing/brute force | Argon2id, IP/e-mail rate limits, generic errors, audit                            | distributed low-and-slow attacks                     |
| account enumeration             | uniform forgot/login responses, dummy verification, normalized timing             | side channels through external mail delivery         |
| token theft/replay              | TLS, HttpOnly/Secure cookies, short JWT, refresh rotation/family reuse detection  | compromised endpoint/browser                         |
| CSRF                            | SameSite, origin validation, CSRF token on cookie-authenticated mutations         | browser/platform behavior defects                    |
| session fixation                | server-generated session IDs and rotation at authentication                       | malware-controlled browser                           |
| cross-tenant IDOR               | active membership-derived tenant, scoped repositories, RLS, composite constraints | defects in future administrative paths               |
| privilege escalation            | deny-by-default RBAC, explicit ABAC, protected roles, audit                       | catalogue misconfiguration                           |
| invitation theft/replay         | random token, hash at rest, expiry, single acceptance, revocation                 | mailbox compromise                                   |
| last-owner lockout              | serialized transaction and invariant                                              | emergency ownership recovery requires future process |
| audit tampering                 | append-only API, restricted DB privileges, no update/delete path                  | migration-owner compromise                           |
| Outbox loss/duplication         | atomic transaction, event IDs, leases, idempotent consumers                       | poison message operational delay                     |
| sensitive logging               | structured allowlist/redaction and tests                                          | developer-added unsafe metadata                      |
| RLS bypass/context leak         | non-owner runtime role, FORCE RLS, transaction-local context, pooling tests       | provider superuser misuse                            |

## Security assumptions

Production runs behind TLS and a trusted proxy that sanitizes forwarding headers. Secrets come from a managed secret store. Migration credentials are not available to application processes. No production credential or customer data is used in development or CI.

The official CI E2E starts the API with a disposable `NOSUPERUSER NOBYPASSRLS` role instead of the migration owner. Browser mutations are rejected when an `Origin` header is present and is not in `WEB_ORIGIN`. Preview environments must set their exact origin and `COOKIE_SECURE=true`; cross-subdomain deployments may set an explicit `COOKIE_DOMAIN`.
