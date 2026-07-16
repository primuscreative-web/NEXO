import { describe, expect, it, vi } from 'vitest'
import {
  OutboxRelay,
  type ClaimedOutboxEvent,
  type IntegrationEventPublisher,
  type OutboxStore,
} from '../src/index.js'

const event: ClaimedOutboxEvent = {
  id: '10000000-0000-4000-8000-000000000001',
  eventType: 'OrganizationCreated',
  eventVersion: 1,
  occurredAt: new Date('2026-07-16T12:00:00Z'),
  source: 'nexo.phase1',
  correlationId: '20000000-0000-4000-8000-000000000001',
  organizationId: '30000000-0000-4000-8000-000000000001',
  payload: { organizationId: '30000000-0000-4000-8000-000000000001' },
  attempts: 1,
}

function storeFor(events: ClaimedOutboxEvent[]) {
  const markPublished = vi.fn().mockResolvedValue(undefined)
  const markFailed = vi.fn().mockResolvedValue(undefined)
  const store: OutboxStore = {
    claim: vi.fn().mockResolvedValue(events),
    markPublished,
    markFailed,
  }
  return { store, markPublished, markFailed }
}

describe('OutboxRelay', () => {
  it('marks an event published only after transport acknowledgement', async () => {
    const { store, markPublished, markFailed } = storeFor([event])
    const publisher: IntegrationEventPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
    }
    await expect(new OutboxRelay(store, publisher).runOnce()).resolves.toEqual({
      published: 1,
      failed: 0,
      dead: 0,
    })
    expect(markPublished).toHaveBeenCalledWith(event.id)
    expect(markFailed).not.toHaveBeenCalled()
  })

  it('retries failures and quarantines poison messages at the limit', async () => {
    const poison = { ...event, attempts: 10 }
    const { store, markPublished, markFailed } = storeFor([poison])
    const publisher: IntegrationEventPublisher = {
      publish: vi.fn().mockRejectedValue(new Error('provider\nsecret detail')),
    }
    await expect(
      new OutboxRelay(store, publisher, { maxAttempts: 10 }).runOnce(),
    ).resolves.toEqual({ published: 0, failed: 1, dead: 1 })
    expect(markPublished).not.toHaveBeenCalled()
    expect(markFailed).toHaveBeenCalledWith(
      poison.id,
      'provider secret detail',
      true,
    )
  })
})
