# ADR-008 — Authentication

**Status:** Accepted; adapter decision required before Phase 1 implementation

## Context

NEXO needs short access tokens, rotating refresh sessions, MFA, revocation, and future passkeys.

## Problem

Fully custom credentials increase security risk; SaaS identity creates dependency and cost.

## Alternatives evaluated

Fully custom auth; external SaaS; owned Identity domain with an adapter.

## Decision

Own the Identity domain and session contracts while choosing the credential adapter after the Phase 1 threat model.

## Consequences

Phase 0 implements no login, credential storage, JWT, or user table.
