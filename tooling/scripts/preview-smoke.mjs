import pg from 'pg'
import Redis from 'ioredis'
import { SignJWT, importPKCS8, importSPKI, jwtVerify } from 'jose'
import { randomUUID } from 'node:crypto'

if (
  process.env.APP_ENV !== 'preview' ||
  process.env.PREVIEW_CONFIRM !== 'NEXO_PREVIEW'
)
  throw new Error(
    'Refusing preview smoke test outside explicit preview confirmation',
  )
for (const key of [
  'DATABASE_URL',
  'REDIS_URL',
  'NEXT_PUBLIC_API_URL',
  'AUTH_JWT_PRIVATE_KEY',
  'AUTH_JWT_PUBLIC_KEY',
  'AUTH_JWT_ISSUER',
  'AUTH_JWT_AUDIENCE',
]) {
  if (!process.env[key]) throw new Error(`Missing ${key}`)
}
const database = new pg.Client({ connectionString: process.env.DATABASE_URL })
const redis = new Redis(process.env.REDIS_URL, { lazyConnect: true })
const redisKey = `nexo-preview-smoke:connectivity:${randomUUID()}`
try {
  await database.connect()
  if (!database.connection.stream.encrypted)
    throw new Error('PostgreSQL connection is not using TLS')
  const migrations = await database.query(
    'SELECT count(*)::int AS count FROM "_prisma_migrations"',
  )
  if (migrations.rows[0]?.count < 1)
    throw new Error('No Prisma migrations found')
  const rls = await database.query(
    'SELECT count(*)::int AS count FROM pg_class WHERE relrowsecurity',
  )
  if (rls.rows[0]?.count < 1) throw new Error('RLS is not enabled')
  const tenantConstraints = await database.query(
    `SELECT count(*)::int AS count
       FROM pg_constraint
      WHERE contype = 'f'
        AND conrelid::regclass::text IN ('inbox_conversation_tags', 'inbox_conversations')`,
  )
  if (tenantConstraints.rows[0]?.count < 3)
    throw new Error('Tenant-aware foreign keys are missing')
  await redis.connect()
  if (!redis.options.tls) throw new Error('Redis connection is not using TLS')
  if ((await redis.ping()) !== 'PONG') throw new Error('Redis ping failed')
  await redis.set(redisKey, 'ok', 'PX', 30_000)
  if ((await redis.get(redisKey)) !== 'ok') throw new Error('Redis get failed')
  if ((await redis.pttl(redisKey)) <= 0) throw new Error('Redis expiry failed')
  if ((await redis.del(redisKey)) !== 1) throw new Error('Redis delete failed')
  const privateKey = await importPKCS8(
    process.env.AUTH_JWT_PRIVATE_KEY.replaceAll('\\n', '\n'),
    'EdDSA',
  )
  const publicKey = await importSPKI(
    process.env.AUTH_JWT_PUBLIC_KEY.replaceAll('\\n', '\n'),
    'EdDSA',
  )
  const token = await new SignJWT({ smoke: true })
    .setProtectedHeader({ alg: 'EdDSA' })
    .setIssuer(process.env.AUTH_JWT_ISSUER)
    .setAudience(process.env.AUTH_JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('2m')
    .sign(privateKey)
  await jwtVerify(token, publicKey, {
    issuer: process.env.AUTH_JWT_ISSUER,
    audience: process.env.AUTH_JWT_AUDIENCE,
  })
  const apiUrl =
    process.env.PREVIEW_SMOKE_API_URL ?? process.env.NEXT_PUBLIC_API_URL
  const workerUrl = process.env.PREVIEW_SMOKE_WORKER_URL
  for (const path of ['/health/live', '/health/ready']) {
    const response = await fetch(new URL(path, apiUrl))
    if (!response.ok) throw new Error(`${path} returned ${response.status}`)
  }
  if (workerUrl) {
    for (const path of ['/health/live', '/health/ready']) {
      const response = await fetch(new URL(path, workerUrl))
      if (!response.ok)
        throw new Error(`worker ${path} returned ${response.status}`)
    }
  }
  console.log(
    'Preview connectivity smoke passed: TLS PostgreSQL, TLS Redis, JWT, schema protections, and health.',
  )
} finally {
  await redis.del(redisKey).catch(() => undefined)
  await Promise.allSettled([database.end(), redis.quit()])
}
