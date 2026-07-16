# ADR-004 — Domain Driven Design

**Status:** Accepted

## Context

Identity, communication, CRM, AI, automation, and billing have distinct language and ownership.

## Problem

A global data model would couple unrelated rules.

## Alternatives evaluated

Technical layers only; shared global model; pragmatic bounded contexts.

## Decision

Use the thirteen approved Bounded Contexts, created under `packages/contexts` only when needed.

## Consequences

Applications are composition roots and import only public context APIs; ceremonial empty contexts are prohibited.
