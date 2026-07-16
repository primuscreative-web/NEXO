import { z } from 'zod'

const nodeEnvironmentSchema = z.enum(['development', 'test', 'production'])
const logLevelSchema = z.enum([
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
])

export const serviceEnvironmentSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema.default('development'),
  LOG_LEVEL: logLevelSchema.default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional().or(z.literal('')),
})

export const infrastructureEnvironmentSchema = z.object({
  DATABASE_URL: z.url().optional(),
  REDIS_URL: z.url().optional(),
  STORAGE_PROVIDER: z.enum(['s3-compatible']).default('s3-compatible'),
  STORAGE_ENDPOINT: z.url().optional(),
  STORAGE_REGION: z.string().min(1).default('auto'),
  STORAGE_BUCKET: z.string().min(1).optional(),
  STORAGE_ACCESS_KEY_ID: z.string().min(1).optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1).optional(),
})

export type ServiceEnvironment = z.infer<typeof serviceEnvironmentSchema>
export type InfrastructureEnvironment = z.infer<
  typeof infrastructureEnvironmentSchema
>

export function parseServiceEnvironment(
  environment: NodeJS.ProcessEnv,
): ServiceEnvironment {
  return serviceEnvironmentSchema.parse(environment)
}

export function parseInfrastructureEnvironment(
  environment: NodeJS.ProcessEnv,
): InfrastructureEnvironment {
  return infrastructureEnvironmentSchema.parse(environment)
}

export function parsePort(value: string | undefined, fallback: number): number {
  return z.coerce
    .number()
    .int()
    .min(1)
    .max(65_535)
    .default(fallback)
    .parse(value)
}
