import { URL } from 'node:url'

const required = [
  'DATABASE_URL',
  'REDIS_URL',
  'AUTH_JWT_PRIVATE_KEY',
  'AUTH_JWT_PUBLIC_KEY',
  'WEB_ORIGIN',
  'NEXT_PUBLIC_API_URL',
]

if (process.env.APP_ENV !== 'preview') {
  throw new Error(
    'Refusing to validate an environment not marked APP_ENV=preview',
  )
}
for (const key of required) {
  if (!process.env[key])
    throw new Error(`Missing required preview variable: ${key}`)
}
const database = new URL(process.env.DATABASE_URL)
const redis = new URL(process.env.REDIS_URL)
if (!['postgres:', 'postgresql:'].includes(database.protocol))
  throw new Error('DATABASE_URL must use a PostgreSQL URL')
if (!['redis:', 'rediss:'].includes(redis.protocol))
  throw new Error('REDIS_URL must use a Redis URL')
if (!process.env.AUTH_JWT_PRIVATE_KEY.includes('BEGIN'))
  throw new Error('AUTH_JWT_PRIVATE_KEY must be PEM encoded')
if (!process.env.AUTH_JWT_PUBLIC_KEY.includes('BEGIN'))
  throw new Error('AUTH_JWT_PUBLIC_KEY must be PEM encoded')
console.log('Preview environment variables are present and structurally valid.')
