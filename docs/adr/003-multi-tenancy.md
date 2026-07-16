# ADR-003 — Multi-tenancy

**Status:** Accepted

## Context

Users may belong to multiple organizations and tenant data must never leak.

## Problem

A `User.organizationId` model prevents multi-organization membership and application-only filters are fragile.

## Alternatives evaluated

Database per tenant; schema per tenant; shared tables; progressive isolation.

## Decision

Use `User N:N Organization` through Membership and shared tables with mandatory tenant invariants initially.

## Consequences

Repositories, constraints, caches, events, jobs, and tests must be tenant-aware; RLS is decided by a Phase 1 spike.
