import { describe, expect, it } from 'vitest'
import { createIntegrationEvent, sanitizeAuditMetadata } from '../src/index.js'

describe('Platform security primitives', () => {
  it('removes secrets from audit metadata', () => {
    expect(
      sanitizeAuditMetadata({
        password: 'never',
        token: 'never',
        status: 'ok',
      }),
    ).toEqual({ status: 'ok' })
  })

  it('creates versioned, correlated tenant events', () => {
    expect(
      createIntegrationEvent({
        eventId: 'event-1',
        eventType: 'OrganizationCreated',
        source: 'organization',
        correlationId: 'correlation-1',
        organizationId: 'organization-1',
        payload: { name: 'NEXO' },
        occurredAt: new Date('2026-01-01T00:00:00Z'),
      }),
    ).toMatchObject({
      eventVersion: 1,
      metadata: { organizationId: 'organization-1' },
    })
  })
})
