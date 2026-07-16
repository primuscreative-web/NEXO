# Phase 1 authentication

NEXO owns the identity data and exposes it through the Identity public contract. Passwords use Argon2id; access tokens are Ed25519-signed JWTs with a 15-minute lifetime. Refresh tokens are opaque random values, stored only as SHA-256 hashes, rotated on every use and grouped into families. Reuse of a rotated token revokes the family and session.

Web sessions use `HttpOnly`, `Secure` outside local development and `SameSite=Lax` cookies. Mutations additionally require the non-HttpOnly CSRF value in `X-CSRF-Token`. CORS accepts only configured web origins. Login and recovery routes are rate limited and return non-enumerating responses where disclosure would be unsafe.

Registration creates a single-use, hashed, 24-hour email-verification token. Password reset tokens are also single-use and hashed. Changing or resetting a password revokes active sessions. Production requires configured Ed25519 keys; ephemeral keys are restricted to non-production execution.

See ADR 013 and the session runbook.
