import pg from 'pg'
import Redis from 'ioredis'

if (
  process.env.APP_ENV !== 'preview' ||
  process.env.PREVIEW_CONFIRM !== 'NEXO_PREVIEW'
)
  throw new Error(
    'Refusing preview smoke test outside explicit preview confirmation',
  )
for (const key of ['DATABASE_URL', 'REDIS_URL', 'NEXT_PUBLIC_API_URL']) {
  if (!process.env[key]) throw new Error(`Missing ${key}`)
}
const database = new pg.Client({ connectionString: process.env.DATABASE_URL })
const redis = new Redis(process.env.REDIS_URL, { lazyConnect: true })
try {
  await database.connect()
  const migrations = await database.query(
    'SELECT count(*)::int AS count FROM "_prisma_migrations"',
  )
  if (migrations.rows[0]?.count < 1)
    throw new Error('No Prisma migrations found')
  await redis.connect()
  if ((await redis.ping()) !== 'PONG') throw new Error('Redis ping failed')
  for (const path of ['/health/live', '/health/ready']) {
    const response = await fetch(new URL(path, process.env.NEXT_PUBLIC_API_URL))
    if (!response.ok) throw new Error(`${path} returned ${response.status}`)
  }
  console.log(
    'Preview smoke passed: PostgreSQL, Redis, migrations, and API health.',
  )
} finally {
  await Promise.allSettled([database.end(), redis.quit()])
}
