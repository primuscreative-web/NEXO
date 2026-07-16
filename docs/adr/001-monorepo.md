# ADR-001 — Monorepo

**Status:** Accepted

## Context

Four deployable applications share contracts, tooling, and coordinated changes.

## Problem

Polyrepos would create premature version coordination and inconsistent gates.

## Alternatives evaluated

Polyrepo; uncoordinated workspace; workspaces with a task graph.

## Decision

Use pnpm workspaces and Turborepo with one lockfile and boundary checks.

## Consequences

Changes can be atomic and cached; CI and import rules must prevent accidental coupling.
