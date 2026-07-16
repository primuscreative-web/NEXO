import type { IntegrationEvent } from '@nexo/events'

export const auditActions = [
  'user.registered',
  'auth.login.succeeded',
  'auth.login.failed',
  'auth.logout',
  'auth.refresh.rejected',
  'auth.password.reset',
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
