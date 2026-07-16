# Phase 1 Outbox operations

PostgreSQL is the durable event ledger. The worker leases eligible rows with `FOR UPDATE SKIP LOCKED`, publishes them to the `nexo-integration-events` BullMQ queue using the event UUID as `jobId`, and marks the row `PUBLISHED` only after Redis acknowledges the enqueue.

Failures return to `PENDING` with bounded exponential backoff. After ten delivery attempts the event becomes `DEAD`; operators must inspect `lastError`, correct the cause and explicitly reset the row to `PENDING`. A stale `PUBLISHING` lease is reclaimable after 30 seconds. BullMQ is transport, not the source of truth.

Production must use separate credentials: the API role is `NOSUPERUSER NOBYPASSRLS`; the worker receives only the platform/Outbox privileges it needs. Queue consumers must use `eventId` as their idempotency key because a crash after enqueue and before acknowledgement can produce at-least-once delivery.

Monitor pending age, publish failures, dead-event count, lease recovery and queue latency. Never place tokens, passwords, provider secrets or unrestricted PII in payloads or `lastError`.
