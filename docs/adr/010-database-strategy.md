# ADR-010 — Database Strategy

**Status:** Accepted

## Context

The platform needs transactions, integrity, multi-tenancy, and controlled evolution.

## Problem

Multiple databases now would complicate consistency; shared access would couple contexts.

## Alternatives evaluated

Database per context; NoSQL primary; PostgreSQL with logical ownership.

## Decision

Use PostgreSQL 17 and Prisma 7 with immutable migrations and logical table ownership. Phase 0 creates only the `pgcrypto` foundation extension.

Development uses an isolated managed PostgreSQL project (Supabase or Neon) when persistence is needed. See ADR-012. PostgreSQL access remains behind a port so provider and topology choices do not enter domain code.

## Consequences

Advanced PostgreSQL features may use reviewed, parameterized SQL. Persistence models are not domain entities.
