import { describe, expect, it, vi } from 'vitest'
import { InMemoryEventBus, type IntegrationEvent } from '../src/index.js'

const event: IntegrationEvent<{ readonly value: number }> = {
  eventId: 'event-1',
  eventType: 'FoundationChecked.v1',
  eventVersion: 1,
  occurredAt: '2026-07-15T00:00:00.000Z',
  source: 'test',
  payload: { value: 1 },
  metadata: { correlationId: 'correlation-1' },
}

describe('InMemoryEventBus', () => {
  it('publishes to subscribers and supports unsubscribe', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn(() => Promise.resolve())
    const unsubscribe = bus.subscribe(event.eventType, handler)
    await bus.publish([event])
    unsubscribe()
    await bus.publish([event])
    expect(handler).toHaveBeenCalledOnce()
  })
})
