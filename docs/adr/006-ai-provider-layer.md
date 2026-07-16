# ADR-006 — AI Provider Layer

**Status:** Accepted; implementation deferred to Phase 5

## Context

Model capabilities, prices, regions, and policies vary.

## Problem

Direct SDK use in business logic creates provider lock-in.

## Alternatives evaluated

Single provider; generic external framework; capability-oriented NEXO ports.

## Decision

Use capability-oriented ports and provider adapters derived from real Phase 5 use cases.

## Consequences

Phase 0 creates no AI package, SDK, router, prompt engine, or speculative universal interface.
