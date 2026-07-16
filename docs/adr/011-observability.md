# ADR-011 — Observability

**Status:** Accepted

## Context

Requests, jobs, events, webhooks, AI, and voice need end-to-end correlation.

## Problem

Unstructured logs and provider-specific SDKs do not provide portable diagnosis.

## Alternatives evaluated

Plain logs; vendor SDKs throughout code; OpenTelemetry-compatible instrumentation.

## Decision

Use structured Pino logs, OpenTelemetry APIs, correlation propagation, redaction, and replaceable exporters.

## Consequences

Cardinality and sensitive data must be controlled; Phase 0 establishes logging and trace-context foundations only.
