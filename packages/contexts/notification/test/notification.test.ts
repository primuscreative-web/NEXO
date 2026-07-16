import { describe, expect, it } from 'vitest'
import { InMemoryEmailDeliveryAdapter } from '../src/index.js'

describe('InMemoryEmailDeliveryAdapter', () => {
  it('deduplicates delivery by idempotency key', async () => {
    const adapter = new InMemoryEmailDeliveryAdapter()
    const message = {
      to: 'pessoa@example.com',
      template: 'verify-email' as const,
      parameters: { token: 'test-only' },
      idempotencyKey: 'verify:user-1',
    }
    await adapter.send(message)
    await adapter.send(message)
    expect(adapter.messages).toHaveLength(1)
  })
})
