# ADR-009 — Feature Flags

**Status:** Accepted; tenant implementation deferred to Phases 1–2

## Context

Features need safe rollout and organization-level kill switches.

## Problem

Environment-only flags cannot target tenants; premature persistence lacks Organization.

## Alternatives evaluated

Environment variables; SaaS provider; internal port with replaceable adapter.

## Decision

Document safe defaults in Phase 0 and implement server-side tenant evaluation after Organization exists.

## Consequences

Flags never replace authorization or billing entitlements and must have owners and expiry.
