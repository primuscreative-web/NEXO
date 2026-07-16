import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const { Pool } = pg
const connectionString = process.env.TEST_DATABASE_URL
const configured = Boolean(connectionString)
const pool = connectionString ? new Pool({ connectionString, max: 2 }) : null
const ids = {
  organizationA: '10000000-0000-4000-8000-000000000001',
  organizationB: '10000000-0000-4000-8000-000000000002',
}

beforeAll(async () => {
  if (!pool) return
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nexo_phase1_test_app') THEN
        CREATE ROLE nexo_phase1_test_app NOLOGIN NOSUPERUSER NOBYPASSRLS;
      END IF;
    END $$;
    GRANT USAGE ON SCHEMA public, nexo_private TO nexo_phase1_test_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexo_phase1_test_app;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA nexo_private TO nexo_phase1_test_app;
    INSERT INTO "organization_organizations" ("id", "name", "slug", "updatedAt")
    VALUES
      ('${ids.organizationA}', 'Tenant A', 'tenant-a-rls', now()),
      ('${ids.organizationB}', 'Tenant B', 'tenant-b-rls', now())
    ON CONFLICT ("id") DO NOTHING;
  `)
})

afterAll(async () => {
  if (!pool) return
  await pool.query(
    `ALTER TABLE "platform_audit_logs" DISABLE TRIGGER platform_audit_logs_append_only`,
  )
  await pool.query(
    `DELETE FROM "platform_audit_logs" WHERE "organizationId" IN ($1, $2)`,
    [ids.organizationA, ids.organizationB],
  )
  await pool.query(
    `ALTER TABLE "platform_audit_logs" ENABLE TRIGGER platform_audit_logs_append_only`,
  )
  await pool.query(
    `DELETE FROM "organization_organizations" WHERE "id" IN ($1, $2)`,
    [ids.organizationA, ids.organizationB],
  )
  await pool.end()
})

describe.skipIf(!configured)('Phase 1 PostgreSQL isolation', () => {
  it('applies every immutable migration', async () => {
    const result = await pool!.query<{ migration_name: string }>(
      `SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL`,
    )
    expect(result.rows.map((row) => row.migration_name)).toContain(
      '20260716040000_identity_organization',
    )
  })

  it('filters another tenant and rejects cross-tenant writes under the runtime role', async () => {
    const client = await pool!.connect()
    try {
      await client.query('BEGIN')
      await client.query('SET LOCAL ROLE nexo_phase1_test_app')
      await client.query(
        `SELECT set_config('app.current_organization_id', $1, true)`,
        [ids.organizationA],
      )
      const visible = await client.query<{ id: string }>(
        `SELECT "id" FROM "organization_organizations" ORDER BY "id"`,
      )
      expect(visible.rows).toEqual([{ id: ids.organizationA }])
      await expect(
        client.query(
          `INSERT INTO "organization_teams" ("id", "organizationId", "name", "normalizedName", "updatedAt") VALUES (gen_random_uuid(), $1, 'Cross tenant', 'cross tenant', now())`,
          [ids.organizationB],
        ),
      ).rejects.toThrow()
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
  })

  it('clears transaction-local tenant context before a pooled connection is reused', async () => {
    const client = await pool!.connect()
    try {
      await client.query('BEGIN')
      await client.query('SET LOCAL ROLE nexo_phase1_test_app')
      await client.query(
        `SELECT set_config('app.current_organization_id', $1, true)`,
        [ids.organizationA],
      )
      expect(
        (
          await client.query<{ tenant: string }>(
            `SELECT current_setting('app.current_organization_id', true) AS tenant`,
          )
        ).rows[0]?.tenant,
      ).toBe(ids.organizationA)
      await client.query('COMMIT')

      await client.query('BEGIN')
      await client.query('SET LOCAL ROLE nexo_phase1_test_app')
      const context = await client.query<{ tenant: string | null }>(
        `SELECT NULLIF(current_setting('app.current_organization_id', true), '') AS tenant`,
      )
      expect(context.rows[0]?.tenant).toBeNull()
      const visible = await client.query(
        `SELECT "id" FROM "organization_organizations"`,
      )
      expect(visible.rows).toEqual([])
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
  })

  it('keeps audit records append-only', async () => {
    const correlationId = '20000000-0000-4000-8000-000000000001'
    const created = await pool!.query<{ id: string }>(
      `INSERT INTO "platform_audit_logs" ("id", "organizationId", "action", "resourceType", "correlationId") VALUES (gen_random_uuid(), $1, 'organization.created', 'Organization', $2) RETURNING "id"`,
      [ids.organizationA, correlationId],
    )
    await expect(
      pool!.query(`DELETE FROM "platform_audit_logs" WHERE "id" = $1`, [
        created.rows[0]!.id,
      ]),
    ).rejects.toThrow(/append-only/u)
  })

  it('allows an identity audit insert without exposing the row to anonymous reads', async () => {
    const client = await pool!.connect()
    const auditId = '20000000-0000-4000-8000-000000000002'
    try {
      await client.query('BEGIN')
      await client.query('SET LOCAL ROLE nexo_phase1_test_app')
      const inserted = await client.query(
        `INSERT INTO "platform_audit_logs" ("id", "action", "resourceType", "correlationId") VALUES ($1, 'auth.login.failed', 'User', $1)`,
        [auditId],
      )
      expect(inserted.rowCount).toBe(1)
      const visible = await client.query<{ id: string }>(
        `SELECT "id" FROM "platform_audit_logs" WHERE "id" = $1`,
        [auditId],
      )
      expect(visible.rows).toEqual([])
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
  })
})
