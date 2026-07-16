# ADR-012 — Managed Development Infrastructure

**Status:** Accepted

## Context

Phase 0 originally treated Docker Desktop and local PostgreSQL/Redis containers as the default developer environment. The project must remain usable without a local container runtime.

## Problem

Making Docker Desktop mandatory increases workstation coupling and blocks installation, quality gates and application execution when its engine is unavailable. Integration tests must also be unable to reach real developer or production data accidentally.

## Alternatives evaluated

Mandatory Docker Desktop; locally installed database services; managed development providers; embedded substitutes; infrastructure only in CI.

## Decision

Local application and quality workflows are infrastructure-optional. Development persistence uses an isolated Supabase or Neon PostgreSQL project and isolated Upstash Redis when needed. Future object storage uses Supabase Storage or an S3-compatible provider behind `ObjectStoragePort`. PostgreSQL and Redis health access use replaceable ports and adapters.

Integration tests read only `TEST_DATABASE_URL` and `TEST_REDIS_URL`; they skip external checks when either is absent. CI supplies ephemeral PostgreSQL and Redis services and maps their disposable URLs to the test variables. Dockerfiles and Compose remain optional artifacts, validated only by a manually dispatched workflow.

## Consequences

All static gates, unit tests, build and liveness/E2E smoke tests run without Docker or provider credentials. Local integration against real protocols requires dedicated disposable resources. Readiness correctly fails when dependencies are not configured. Provider accounts, quotas, network latency and cost require operational monitoring. No provider credential is committed, and production credentials are prohibited in development and tests.
