# ADR-005 — Event Bus

**Status:** Accepted

## Context

Cross-context facts and asynchronous work need decoupled communication.

## Problem

Direct calls create temporal coupling; dual writes lose events.

## Alternatives evaluated

Synchronous calls only; broker-specific APIs; transport-agnostic port with Outbox/Inbox.

## Decision

Define a minimal Event Bus port in Phase 0. Integration events use versioned envelopes, at-least-once delivery, Outbox/Inbox, idempotency, and DLQ policies when persistence is introduced.

## Consequences

The in-memory adapter supports tests only. BullMQ is a work queue, never the authoritative business event ledger.
