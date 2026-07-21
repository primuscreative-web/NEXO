import { afterEach, describe, expect, it, vi } from 'vitest'
import { OutboxRelayService } from '../src/outbox-relay.service.js'

const originalEnvironment = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnvironment }
  vi.restoreAllMocks()
})

describe('OutboxRelayService', () => {
  it('keeps the host process alive when Redis configuration is malformed', async () => {
    process.env.DATABASE_URL = 'postgresql://user:password@example.test:5432/db'
    process.env.REDIS_URL = 'not a redis url'
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true)

    const service = new OutboxRelayService()

    expect(() => service.onModuleInit()).not.toThrow()
    expect(service.isReady()).toBe(false)
    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining('relay unavailable'),
    )

    await service.onModuleDestroy()
  })
})
