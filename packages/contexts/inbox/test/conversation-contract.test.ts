import { describe, expect, it } from 'vitest'

import {
  SimulatorChannelProvider,
  assertConversationTransition,
} from '../src/index.js'

describe('conversation status contract', () => {
  it.each([
    ['OPEN', 'PENDING'],
    ['PENDING', 'OPEN'],
    ['OPEN', 'CLOSED'],
    ['PENDING', 'CLOSED'],
    ['CLOSED', 'OPEN'],
  ] as const)('permits %s to %s', (current, next) => {
    expect(() => assertConversationTransition(current, next)).not.toThrow()
  })

  it.each([
    ['OPEN', 'OPEN'],
    ['CLOSED', 'PENDING'],
    ['RESOLVED', 'PENDING'],
  ] as const)('rejects %s to %s', (current, next) => {
    expect(() => assertConversationTransition(current, next)).toThrow(
      'invalid_conversation_transition',
    )
  })
})

describe('simulator channel provider', () => {
  it('returns a deterministic external id for outbound messages', async () => {
    const provider = new SimulatorChannelProvider()
    await expect(
      provider.send({
        channelAccountId: 'account',
        body: 'Olá',
        idempotencyKey: 'message-1',
      }),
    ).resolves.toEqual({ externalId: 'sim:message-1' })
  })
})
