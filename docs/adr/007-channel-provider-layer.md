# ADR-007 — Channel Provider Layer

**Status:** Accepted; implementation deferred to Phases 3–4

## Context

WhatsApp and Instagram differ and future channels must not change Inbox rules.

## Problem

Provider conditionals inside Inbox would spread coupling.

## Alternatives evaluated

Channel-specific Inbox logic; external channel service; ports and adapters.

## Decision

Derive normalized channel capabilities with Inbox and implement only official Meta adapters.

## Consequences

Phase 0 creates no channel package or provider contract; app approval remains a commercial gate.
