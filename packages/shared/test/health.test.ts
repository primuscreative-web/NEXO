import { describe, expect, it } from 'vitest'
import { createHealthSnapshot } from '../src/index.js'

describe('createHealthSnapshot', () => {
  it('returns an immutable-shaped service snapshot', () => {
    const snapshot = createHealthSnapshot(
      'api',
      new Date('2026-07-15T00:00:00.000Z'),
    )
    expect(snapshot).toMatchObject({
      service: 'api',
      status: 'ok',
      timestamp: '2026-07-15T00:00:00.000Z',
    })
    expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0)
  })
})
