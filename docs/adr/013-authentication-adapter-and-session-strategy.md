# ADR-013 — Authentication Adapter and Session Strategy

**Status:** Accepted

## Context

ADR-008 requires an owned Identity domain and a Phase 1 build-versus-buy decision before credentials are implemented. NEXO needs Web/API compatibility, auditable session revocation, refresh reuse detection and future MFA/passkeys without binding tenant authorization to an identity vendor.

## Problem

A SaaS provider accelerates basic login but makes NEXO session semantics, exportability and recovery depend on provider claims and pricing. A broad self-hosted auth framework would also own persistence and flows that the Identity bounded context must control. Implementing cryptographic primitives directly is unsafe.

## Alternatives evaluated

1. External identity SaaS (Auth0, Clerk or equivalent).
2. Full self-hosted auth framework/plugin system.
3. NEXO-owned Identity and session protocol using narrow, reviewed cryptographic adapters.
4. Ad-hoc custom cryptography.

## Decision

Use option 3. Identity owns users, credential lifecycle, sessions, recovery and audit semantics. Password hashing is an adapter backed by Argon2id with OWASP-minimum-or-stronger parameters. Access tokens are short-lived asymmetric JWTs with issuer, audience, subject, session ID and expiry validation. Refresh tokens are 256-bit opaque random values stored only as SHA-256 hashes, rotated on every use and grouped by family; reuse revokes the family.

Web delivery uses HttpOnly cookies with `Secure` in production, `SameSite=Lax`, constrained path and explicit CSRF/origin checks for state-changing requests. API clients may use bearer access tokens; refresh remains bound to the session contract. Password changes and recovery revoke other sessions. Generic responses and dummy hash verification reduce account enumeration and timing leakage.

MFA, passkeys, social login and enterprise federation remain deferred. Their future adapters must enter through Identity contracts and cannot redefine Organization authorization.

## Consequences

NEXO retains session control and provider independence, but owns more security-sensitive application code. Cryptographic adapters require contract tests, dependency review, key rotation procedures and a threat-model update on every new authentication method. JWT signing keys and any pepper remain secret-manager values and never enter the database or repository.
