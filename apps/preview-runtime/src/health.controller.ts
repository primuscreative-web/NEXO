import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common'
import { Public } from '@nexo/api/preview'
import { RedisCacheHealthAdapter } from '@nexo/cache'
import { PostgresDatabaseHealthAdapter } from '@nexo/database'
import { createHealthSnapshot } from '@nexo/shared'
import { OutboxRelayService } from '@nexo/worker/preview'

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
  async ready() {
    const databaseUrl = process.env.DATABASE_URL
    const redisUrl = process.env.REDIS_URL
    if (!databaseUrl || !redisUrl)
      throw new ServiceUnavailableException(
        'Required dependencies are not configured',
      )

    const database = new PostgresDatabaseHealthAdapter(databaseUrl)
    const cache = new RedisCacheHealthAdapter(redisUrl)

    try {
      const [databaseHealth, redisHealthy] = await Promise.all([
        database.check(),
        cache.check(),
      ])
      const workerHealthy = this.relay.isReady()
      if (!databaseHealth.healthy || !redisHealthy || !workerHealthy)
        throw new Error('Preview runtime dependency unavailable')
      return {
        ...createHealthSnapshot('preview-runtime'),
        dependencies: {
          api: true,
          database: databaseHealth.healthy,
          redis: redisHealthy,
          worker: workerHealthy,
          relay: workerHealthy,
        },
      }
    } catch {
      throw new ServiceUnavailableException(
        'A required dependency is unavailable',
      )
    }
  }
}
