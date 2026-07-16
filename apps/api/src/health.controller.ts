import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { RedisCacheHealthAdapter } from '@nexo/cache'
import { PostgresDatabaseHealthAdapter } from '@nexo/database'
import { createHealthSnapshot } from '@nexo/shared'

@Controller('health')
export class HealthController {
  @Get('live')
  live() {
    return createHealthSnapshot('api')
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
      const [databaseHealth, cacheHealthy] = await Promise.all([
        database.check(),
        cache.check(),
      ])
      return {
        ...createHealthSnapshot('api'),
        dependencies: {
          database: databaseHealth.healthy,
          redis: cacheHealthy,
        },
      }
    } catch {
      throw new ServiceUnavailableException(
        'A required dependency is unavailable',
      )
    }
  }
}
