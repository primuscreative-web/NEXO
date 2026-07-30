import { Controller, Get, Inject, Res } from '@nestjs/common'
import { Public } from '@nexo/api/preview'
import { RedisCacheHealthAdapter } from '@nexo/cache'
import { PostgresDatabaseHealthAdapter } from '@nexo/database'
import { createHealthSnapshot } from '@nexo/shared'
import { OutboxRelayService } from '@nexo/worker/preview'

type DependencyCheckStatus = 'ok' | 'failed' | 'missing'

interface PreviewReadinessBody {
  readonly service: 'preview-runtime'
  readonly status: 'ok' | 'degraded'
  readonly timestamp: string
  readonly uptimeSeconds: number
  readonly checks: {
    readonly api: DependencyCheckStatus
    readonly database: DependencyCheckStatus
    readonly redis: DependencyCheckStatus
    readonly worker: DependencyCheckStatus
    readonly relay: DependencyCheckStatus
  }
  readonly details: {
    readonly database?: string
    readonly redis?: string
    readonly relay?: string
  }
}

interface StatusReply {
  status(code: number): StatusReply
}

let lastDegradedReadinessLogAt = 0

@Public()
@Controller('health')
export class PreviewHealthController {
  constructor(
    @Inject(OutboxRelayService)
    private readonly relay: OutboxRelayService,
  ) {}

  @Get('live')
  live() {
    return createHealthSnapshot('preview-runtime')
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) reply: StatusReply) {
    const databaseUrl = process.env.DATABASE_URL
    const redisUrl = process.env.REDIS_URL
    const [database, redis] = await Promise.all([
      checkDatabase(databaseUrl),
      checkRedis(redisUrl),
    ])
    const relay = this.relay.status()
    const relayStatus = relay.healthy
      ? 'ok'
      : relay.configured
        ? 'failed'
        : 'missing'
    const body = createReadinessBody({
      database,
      redis,
      relay: {
        status: relayStatus,
        ...(relay.reason ? { detail: relay.reason } : {}),
      },
    })

    if (body.status === 'ok') return body
    logDegradedReadiness(body)
    reply.status(503)
    return body
  }
}

async function checkDatabase(databaseUrl: string | undefined): Promise<{
  readonly status: DependencyCheckStatus
  readonly detail?: string
}> {
  if (!databaseUrl) return { status: 'missing', detail: 'DATABASE_URL missing' }
  try {
    const database = new PostgresDatabaseHealthAdapter(databaseUrl)
    const result = await database.check()
    return result.healthy
      ? { status: 'ok' }
      : { status: 'failed', detail: 'database health check returned false' }
  } catch {
    return { status: 'failed', detail: 'database health check failed' }
  }
}

async function checkRedis(redisUrl: string | undefined): Promise<{
  readonly status: DependencyCheckStatus
  readonly detail?: string
}> {
  if (!redisUrl) return { status: 'missing', detail: 'REDIS_URL missing' }
  try {
    const cache = new RedisCacheHealthAdapter(redisUrl)
    const healthy = await cache.check()
    return healthy
      ? { status: 'ok' }
      : { status: 'failed', detail: 'redis health check returned false' }
  } catch {
    return { status: 'failed', detail: 'redis health check failed' }
  }
}

function createReadinessBody(input: {
  readonly database: {
    readonly status: DependencyCheckStatus
    readonly detail?: string
  }
  readonly redis: {
    readonly status: DependencyCheckStatus
    readonly detail?: string
  }
  readonly relay: {
    readonly status: DependencyCheckStatus
    readonly detail?: string
  }
}): PreviewReadinessBody {
  const snapshot = createHealthSnapshot('preview-runtime')
  const workerStatus = input.relay.status
  const degraded =
    input.database.status !== 'ok' ||
    input.redis.status !== 'ok' ||
    input.relay.status !== 'ok'

  return {
    ...snapshot,
    service: 'preview-runtime',
    status: degraded ? 'degraded' : 'ok',
    checks: {
      api: 'ok',
      database: input.database.status,
      redis: input.redis.status,
      worker: workerStatus,
      relay: input.relay.status,
    },
    details: {
      ...(input.database.detail ? { database: input.database.detail } : {}),
      ...(input.redis.detail ? { redis: input.redis.detail } : {}),
      ...(input.relay.detail ? { relay: input.relay.detail } : {}),
    },
  }
}

function logDegradedReadiness(body: PreviewReadinessBody): void {
  const now = Date.now()
  if (now - lastDegradedReadinessLogAt < 30_000) return
  lastDegradedReadinessLogAt = now
  process.stderr.write(
    `[preview-runtime] readiness degraded ${JSON.stringify({
      checks: body.checks,
      details: body.details,
    })}\n`,
  )
}
