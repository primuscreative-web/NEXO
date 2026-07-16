# Event Conventions

Phase 0 defines an in-memory Event Bus for contracts and tests. It does not publish business events.

Future integration events must include `eventId`, past-tense `eventType`, integer `eventVersion`, ISO `occurredAt`, `source`, payload, correlation ID, optional causation/actor, and mandatory organization ID for tenant-owned facts.

Delivery is at least once. Consumers are idempotent. Persistent publication uses PostgreSQL Transactional Outbox; consumer deduplication uses an Inbox ledger or equivalent durable invariant. Replay is authorized and audited. BullMQ is a job transport, not a business event ledger.
