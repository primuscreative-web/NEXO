import { Redis } from 'ioredis'
import pg from 'pg'
import { afterAll, describe, expect, it } from 'vitest'

const { Pool } = pg
const databaseUrl = process.env.TEST_DATABASE_URL
const redisUrl = process.env.TEST_REDIS_URL
const infrastructureConfigured = Boolean(databaseUrl && redisUrl)
const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, max: 1 })
  : null
const redis = redisUrl
  ? new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    })
  : null

afterAll(async () => {
  await pool?.end()
  redis?.disconnect()
})

describe.skipIf(!infrastructureConfigured)(
  'isolated test infrastructure',
  () => {
    it('accepts PostgreSQL queries', async () => {
      const result = await pool!.query<{ value: number }>('SELECT 1 AS value')
      expect(result.rows[0]?.value).toBe(1)
    })

    it('accepts Redis commands', async () => {
      await redis!.connect()
      expect(await redis!.ping()).toBe('PONG')
    })
  },
)
