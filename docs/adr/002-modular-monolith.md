# ADR-002 — Modular Monolith

**Status:** Accepted

## Context

NEXO has many domains but no measured need for distributed transactions or independent domain deployments.

## Problem

Premature microservices multiply operational failure modes and cost.

## Alternatives evaluated

Microservices; layered monolith; Modular Monolith.

## Decision

Use a NestJS Modular Monolith with separate Web, Worker, and Webhook Gateway processes.

## Consequences

Initial operations stay simple; context packages, public exports, and architecture tests are mandatory.
