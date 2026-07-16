-- Aggregate versions are optional until aggregates expose durable versions.
-- Event identity and enqueue deduplication use the mandatory id/idempotencyKey.
DROP INDEX IF EXISTS "platform_outbox_events_eventType_aggregateId_aggregateVersi_key";
