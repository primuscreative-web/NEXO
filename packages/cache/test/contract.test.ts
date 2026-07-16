import { describe, expect, it } from 'vitest'
import type { CacheHealthPort } from '../src/index.js'

describe('CacheHealthPort', () => {
  it('allows infrastructure to be replaced behind a stable contract', async () => {
    const adapter: CacheHealthPort = { check: () => Promise.resolve(true) }
    await expect(adapter.check()).resolves.toBe(true)
  })
})
