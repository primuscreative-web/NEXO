import pg from 'pg'

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
