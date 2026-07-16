import { randomUUID } from 'node:crypto'
import { createDatabaseClient } from '../../packages/database/src/index.js'
import { PostgresOutboxStore } from '../../apps/worker/src/outbox-relay.service.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const databaseUrl = process.env.TEST_DATABASE_URL
const configured = Boolean(databaseUrl)
const database = databaseUrl ? createDatabaseClient(databaseUrl) : null
const eventIds: string[] = []

afterAll(async () => {
  if (!database) return
  await database.outboxEvent.deleteMany({ where: { id: { in: eventIds } } })
  await database.$disconnect()
})

beforeAll(() => {
  eventIds.length = 0
})

describe.skipIf(!configured)('transactional Outbox relay store', () => {
  it('leases an event once under concurrent workers and only acknowledges explicitly', async () => {
    const id = randomUUID()
    eventIds.push(id)
    await database!.outboxEvent.create({
      data: {
        id,
        idempotencyKey: `integration:${id}`,
        eventType: 'OutboxIntegrationTest',
        eventVersion: 1,
        source: 'nexo.test',
        correlationId: randomUUID(),
        payload: { safe: true },
        occurredAt: new Date(),
      },
    })
    const first = new PostgresOutboxStore(database!)
    const second = new PostgresOutboxStore(database!)
    const claims = await Promise.all([
      first.claim(1, 30_000),
      second.claim(1, 30_000),
    ])
    const targetClaims = claims.flat().filter((event) => event.id === id)
    expect(targetClaims).toHaveLength(1)
    expect(targetClaims[0]?.id).toBe(id)
    expect(
      await database!.outboxEvent.findUnique({ where: { id } }),
    ).toMatchObject({ status: 'PUBLISHING', attempts: 1, publishedAt: null })

    await first.markPublished(id)
    expect(
      await database!.outboxEvent.findUnique({ where: { id } }),
    ).toMatchObject({ status: 'PUBLISHED', attempts: 1 })
  })

  it('returns failures to the durable ledger and quarantines poison messages', async () => {
    const id = randomUUID()
    eventIds.push(id)
    await database!.outboxEvent.create({
      data: {
        id,
        idempotencyKey: `integration:${id}`,
        eventType: 'OutboxPoisonTest',
        eventVersion: 1,
        source: 'nexo.test',
        correlationId: randomUUID(),
        payload: {},
        occurredAt: new Date(),
        status: 'PUBLISHING',
        attempts: 10,
      },
    })
    const store = new PostgresOutboxStore(database!)
    await store.markFailed(id, 'safe failure', true)
    expect(
      await database!.outboxEvent.findUnique({ where: { id } }),
    ).toMatchObject({ status: 'DEAD', lastError: 'safe failure' })
  })
})
