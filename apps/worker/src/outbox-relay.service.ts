import { Injectable } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import {
  createDatabaseClient,
  type DatabaseClient,
  type DatabaseTransaction,
} from '@nexo/database'
import type { IntegrationEvent } from '@nexo/events'
import {
  OutboxRelay,
  type ClaimedOutboxEvent,
  type IntegrationEventPublisher,
  type OutboxStore,
} from '@nexo/platform'
import { Queue } from 'bullmq'

const queueName = 'nexo-integration-events'

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  readonly #databaseUrl = process.env.DATABASE_URL
  readonly #redisUrl = process.env.REDIS_URL
  #database: DatabaseClient | null = null
  #publisher: BullMqEventPublisher | null = null
  #relay: OutboxRelay | null = null
  #timer: NodeJS.Timeout | null = null
  #running = false

  isReady(): boolean {
    return Boolean(
      this.#database && this.#publisher && this.#relay && this.#timer,
    )
  }

  onModuleInit(): void {
    if (!this.#databaseUrl || !this.#redisUrl) return
    try {
      this.#publisher = new BullMqEventPublisher(this.#redisUrl)
      this.#database = createDatabaseClient(this.#databaseUrl)
      this.#relay = new OutboxRelay(
        new PostgresOutboxStore(this.#database),
        this.#publisher,
      )
      this.#timer = setInterval(() => void this.#tick(), 1_000)
      this.#timer.unref()
      void this.#tick()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'relay startup'
      process.stderr.write(
        `[outbox] relay unavailable: ${sanitizeLogMessage(message)}\n`,
      )
      void this.#publisher?.close()
      this.#publisher = null
      void this.#database?.$disconnect()
      this.#database = null
      this.#relay = null
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.#timer) clearInterval(this.#timer)
    await this.#publisher?.close()
    await this.#database?.$disconnect()
  }

  async #tick(): Promise<void> {
    if (!this.#relay || this.#running) return
    this.#running = true
    try {
      const result = await this.#relay.runOnce()
      if (result.failed > 0)
        process.stderr.write(
          `[outbox] publish failures=${result.failed} dead=${result.dead}\n`,
        )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'relay failure'
      process.stderr.write(`[outbox] ${sanitizeLogMessage(message)}\n`)
    } finally {
      this.#running = false
    }
  }
}

export class PostgresOutboxStore implements OutboxStore {
  constructor(private readonly db: DatabaseClient) {}

  claim(batchSize: number, leaseMilliseconds: number) {
    const limit = Math.min(Math.max(Math.trunc(batchSize), 1), 500)
    const leaseSeconds = Math.min(
      Math.max(Math.ceil(leaseMilliseconds / 1_000), 1),
      300,
    )
    return this.db.$transaction((transaction) =>
      this.#claim(transaction, limit, leaseSeconds),
    )
  }

  async #claim(
    transaction: DatabaseTransaction,
    limit: number,
    leaseSeconds: number,
  ): Promise<ClaimedOutboxEvent[]> {
    return transaction.$queryRaw<ClaimedOutboxEvent[]>`
      WITH candidates AS (
        SELECT "id"
        FROM "platform_outbox_events"
        WHERE (
          ("status" = 'PENDING' AND "nextAttemptAt" <= now())
          OR ("status" = 'PUBLISHING' AND "leasedUntil" < now())
        )
        ORDER BY "createdAt"
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      UPDATE "platform_outbox_events" event
      SET "status" = 'PUBLISHING',
          "attempts" = event."attempts" + 1,
          "leasedUntil" = now() + make_interval(secs => ${leaseSeconds})
      FROM candidates
      WHERE event."id" = candidates."id"
      RETURNING event."id", event."eventType", event."eventVersion",
        event."occurredAt", event."source", event."correlationId",
        event."causationId", event."actorId", event."organizationId",
        event."payload", event."attempts"
    `
  }

  async markPublished(eventId: string): Promise<void> {
    await this.db.outboxEvent.updateMany({
      where: { id: eventId, status: 'PUBLISHING' },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        leasedUntil: null,
        lastError: null,
      },
    })
  }

  async markFailed(
    eventId: string,
    error: string,
    dead: boolean,
  ): Promise<void> {
    const record = await this.db.outboxEvent.findUnique({
      where: { id: eventId },
      select: { attempts: true },
    })
    if (!record) return
    const backoffSeconds = Math.min(2 ** Math.min(record.attempts, 10), 900)
    await this.db.outboxEvent.updateMany({
      where: { id: eventId, status: 'PUBLISHING' },
      data: {
        status: dead ? 'DEAD' : 'PENDING',
        leasedUntil: null,
        lastError: error,
        nextAttemptAt: new Date(Date.now() + backoffSeconds * 1_000),
      },
    })
  }
}

export class BullMqEventPublisher implements IntegrationEventPublisher {
  readonly #queue: Queue<IntegrationEvent>

  constructor(redisUrl: string) {
    const url = parseRedisUrl(redisUrl)
    this.#queue = new Queue<IntegrationEvent>(queueName, {
      connection: {
        host: url.hostname,
        port: Number(url.port || 6379),
        ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
        ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
        ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
      },
      defaultJobOptions: {
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    })
  }

  async publish(event: IntegrationEvent): Promise<void> {
    await this.#queue.add(event.eventType, event, { jobId: event.eventId })
  }

  close(): Promise<void> {
    return this.#queue.close()
  }
}

function parseRedisUrl(redisUrl: string): URL {
  const normalized = normalizeSecretUrl(redisUrl)
  if (!normalized) throw new Error('REDIS_URL is empty')

  let url: URL
  try {
    url = new URL(normalized)
  } catch {
    throw new Error('REDIS_URL is not a valid URL')
  }

  if (url.protocol !== 'rediss:')
    throw new Error('REDIS_URL must use rediss://')
  if (!url.hostname || !url.port || !url.username || !url.password)
    throw new Error('REDIS_URL must include host, port, username and password')

  return url
}

function normalizeSecretUrl(value: string): string {
  const trimmed = value.trim()
  const quote = trimmed.at(0)
  if (
    quote &&
    (quote === '"' || quote === "'" || quote === '`') &&
    trimmed.endsWith(quote)
  )
    return trimmed.slice(1, -1).trim()
  return trimmed
}

function sanitizeLogMessage(message: string): string {
  return message.replace(/[\r\n]/gu, ' ')
}
