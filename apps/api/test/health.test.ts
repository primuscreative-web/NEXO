import { describe, expect, it } from 'vitest'
import { ServiceUnavailableException } from '@nestjs/common'
import { HealthController } from '../src/health.controller.js'

describe('API health controller', () => {
  it('reports liveness without external dependencies', () => {
    expect(new HealthController().live()).toMatchObject({
      service: 'api',
      status: 'ok',
    })
  })

  it('reports not ready when managed dependencies are not configured', async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL
    const previousRedisUrl = process.env.REDIS_URL
    delete process.env.DATABASE_URL
    delete process.env.REDIS_URL

    await expect(new HealthController().ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )

    if (previousDatabaseUrl) process.env.DATABASE_URL = previousDatabaseUrl
    if (previousRedisUrl) process.env.REDIS_URL = previousRedisUrl
  })
})
