import type { IntegrationEvent } from '@nexo/events'

export const auditActions = [
  'user.registered',
  'auth.login.succeeded',
  'auth.login.failed',
  'auth.logout',
  'auth.refresh.rejected',
  'auth.password.reset',
  'auth.password.changed',
  'session.revoked',
  'organization.created',
  'organization.updated',
  'invitation.created',
  'invitation.resent',
  'invitation.revoked',
  'invitation.accepted',
  'membership.created',
  'membership.role.changed',
  'membership.suspended',
  'membership.revoked',
  'team.created',
  'team.updated',
  'team.member.added',
  'team.member.removed',
  'permission.changed',
] as const

export type AuditAction = (typeof auditActions)[number]

const forbiddenMetadataKeys = new Set([
  'password',
  'token',
  'authorization',
  'secret',
  'passwordHash',
  'tokenHash',
])

export function sanitizeAuditMetadata(
  metadata: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !forbiddenMetadataKeys.has(key)),
  )
}

export function createIntegrationEvent<TPayload>(input: {
  eventId: string
  eventType: string
  payload: TPayload
  source: string
  correlationId: string
  organizationId?: string
  causationId?: string
  actorId?: string
  occurredAt?: Date
}): IntegrationEvent<TPayload> {
  return {
    eventId: input.eventId,
    eventType: input.eventType,
    eventVersion: 1,
    occurredAt: (input.occurredAt ?? new Date()).toISOString(),
    source: input.source,
    payload: input.payload,
    metadata: {
      correlationId: input.correlationId,
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      ...(input.causationId ? { causationId: input.causationId } : {}),
      ...(input.actorId ? { actorId: input.actorId } : {}),
    },
  }
}

export interface ClaimedOutboxEvent {
  readonly id: string
  readonly eventType: string
  readonly eventVersion: number
  readonly occurredAt: Date
  readonly source: string
  readonly correlationId: string
  readonly causationId?: string
  readonly actorId?: string
  readonly organizationId?: string
  readonly payload: unknown
  readonly attempts: number
}

export interface OutboxStore {
  claim(
    batchSize: number,
    leaseMilliseconds: number,
  ): Promise<ClaimedOutboxEvent[]>
  markPublished(eventId: string): Promise<void>
  markFailed(eventId: string, error: string, dead: boolean): Promise<void>
}

export interface IntegrationEventPublisher {
  publish(event: IntegrationEvent): Promise<void>
}

export class OutboxRelay {
  constructor(
    private readonly store: OutboxStore,
    private readonly publisher: IntegrationEventPublisher,
    private readonly options: {
      batchSize?: number
      leaseMilliseconds?: number
      maxAttempts?: number
    } = {},
  ) {}

  async runOnce(): Promise<{
    published: number
    failed: number
    dead: number
  }> {
    const events = await this.store.claim(
      this.options.batchSize ?? 50,
      this.options.leaseMilliseconds ?? 30_000,
    )
    const result = { published: 0, failed: 0, dead: 0 }
    for (const record of events) {
      try {
        await this.publisher.publish({
          eventId: record.id,
          eventType: record.eventType,
          eventVersion: record.eventVersion,
          occurredAt: record.occurredAt.toISOString(),
          source: record.source,
          payload: record.payload,
          metadata: {
            correlationId: record.correlationId,
            ...(record.causationId ? { causationId: record.causationId } : {}),
            ...(record.actorId ? { actorId: record.actorId } : {}),
            ...(record.organizationId
              ? { organizationId: record.organizationId }
              : {}),
          },
        })
        await this.store.markPublished(record.id)
        result.published += 1
      } catch (error) {
        const dead = record.attempts >= (this.options.maxAttempts ?? 10)
        await this.store.markFailed(record.id, safeOutboxError(error), dead)
        result.failed += 1
        if (dead) result.dead += 1
      }
    }
    return result
  }
}

function safeOutboxError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : 'Unknown publish error'
  return message.replace(/[\r\n\t]/gu, ' ').slice(0, 500)
}
