import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, type Prisma } from './generated/client/client.js'

const { Pool } = pg

export interface DatabaseHealth {
  readonly healthy: boolean
}

export interface DatabaseHealthPort {
  check(): Promise<DatabaseHealth>
}

export class PostgresDatabaseHealthAdapter implements DatabaseHealthPort {
  constructor(private readonly connectionString: string) {}

  async check(): Promise<DatabaseHealth> {
    return checkDatabaseHealth(this.connectionString)
  }
}

export async function checkDatabaseHealth(
  databaseUrl: string,
): Promise<DatabaseHealth> {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 3_000,
  })
  try {
    await pool.query('SELECT 1')
    return { healthy: true }
  } finally {
    await pool.end()
  }
}

export type DatabaseClient = PrismaClient
export type DatabaseJsonInput = Prisma.InputJsonValue
export type DatabaseTransaction = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0]

export interface TenantContext {
  readonly userId: string
  readonly organizationId: string
}

export function createDatabaseClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export function withTenant<T>(
  client: PrismaClient,
  context: TenantContext,
  operation: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return client.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`SELECT set_config('app.current_user_id', ${context.userId}, true)`
      await transaction.$executeRaw`SELECT set_config('app.current_organization_id', ${context.organizationId}, true)`
      return operation(transaction)
    },
    { maxWait: 15_000, timeout: 60_000 },
  )
}

export function withUser<T>(
  client: PrismaClient,
  userId: string,
  operation: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return client.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`
      return operation(transaction)
    },
    { maxWait: 15_000, timeout: 60_000 },
  )
}
