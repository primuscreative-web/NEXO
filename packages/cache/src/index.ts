import { Redis } from 'ioredis'

export interface CacheHealthPort {
  check(): Promise<boolean>
}

export class RedisCacheHealthAdapter implements CacheHealthPort {
  constructor(private readonly connectionString: string) {}

  async check(): Promise<boolean> {
    const redis = new Redis(this.connectionString, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3_000,
      enableOfflineQueue: false,
    })

    try {
      await redis.connect()
      await redis.ping()
      return true
    } finally {
      redis.disconnect()
    }
  }
}
