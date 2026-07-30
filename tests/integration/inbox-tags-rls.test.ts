import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const { Pool } = pg
const url = process.env.TEST_DATABASE_URL
const pool = url ? new Pool({ connectionString: url, max: 2 }) : null
const configured = Boolean(pool)
const a = '30000000-0000-4000-8000-000000000001'
const b = '30000000-0000-4000-8000-000000000002'

async function tenant<T>(
  organizationId: string,
  work: (client: pg.PoolClient) => Promise<T>,
) {
  const client = await pool!.connect()
  try {
    await client.query('BEGIN')
    await client.query('SET LOCAL ROLE nexo_phase1_test_app')
    await client.query(
      `SELECT set_config('app.current_organization_id', $1, true)`,
      [organizationId],
    )
    return await work(client)
  } finally {
    await client.query('ROLLBACK')
    client.release()
  }
}

beforeAll(async () => {
  if (!pool) return
  await pool.query(
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nexo_phase1_test_app') THEN CREATE ROLE nexo_phase1_test_app NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$; GRANT USAGE ON SCHEMA public TO nexo_phase1_test_app; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexo_phase1_test_app;`,
  )
  for (const [id, slug] of [
    [a, 'inbox-tags-a'],
    [b, 'inbox-tags-b'],
  ] as const) {
    await pool.query(
      `INSERT INTO "organization_organizations" ("id","name","slug","updatedAt") VALUES ($1,$2,$3,now()) ON CONFLICT ("id") DO NOTHING`,
      [id, slug, slug],
    )
    await pool.query(
      `INSERT INTO "inbox_inboxes" ("id","organizationId","name","updatedAt") VALUES (gen_random_uuid(),$1,'Inbox',now()) ON CONFLICT DO NOTHING`,
      [id],
    )
    await pool.query(
      `INSERT INTO "crm_contacts" ("id","organizationId","name","updatedAt") VALUES (gen_random_uuid(),$1,'Contact',now()) ON CONFLICT DO NOTHING`,
      [id],
    )
  }
})
afterAll(async () => {
  if (pool) {
    await pool.query(
      `DELETE FROM "organization_organizations" WHERE "id" IN ($1,$2)`,
      [a, b],
    )
    await pool.end()
  }
})

describe.skipIf(!configured)('Inbox conversation tags PostgreSQL RLS', () => {
  it('applies the conversation-tag migration and enforces unique tenant associations', async () => {
    const migrations = await pool!.query<{ migration_name: string }>(
      `SELECT migration_name FROM _prisma_migrations`,
    )
    expect(migrations.rows.map((x) => x.migration_name)).toContain(
      '20260720040000_inbox_conversation_tags',
    )
    const created = await pool!.query<{
      conversationId: string
      tagId: string
    }>(
      `WITH i AS (SELECT "id" FROM "inbox_inboxes" WHERE "organizationId"=$1 LIMIT 1), c AS (SELECT "id" FROM "crm_contacts" WHERE "organizationId"=$1 LIMIT 1), v AS (INSERT INTO "inbox_conversations" ("organizationId","inboxId","contactId","updatedAt") SELECT $1,i."id",c."id",now() FROM i,c RETURNING "id"), t AS (INSERT INTO "inbox_tags" ("organizationId","name") VALUES ($1,'vip') RETURNING "id") INSERT INTO "inbox_conversation_tags" ("organizationId","conversationId","tagId") SELECT $1,v."id",t."id" FROM v,t RETURNING "conversationId","tagId"`,
      [a],
    )
    const row = created.rows[0]!
    await expect(
      pool!.query(
        `INSERT INTO "inbox_conversation_tags" ("organizationId","conversationId","tagId") VALUES ($1,$2,$3)`,
        [a, row.conversationId, row.tagId],
      ),
    ).rejects.toThrow()
  })
  it('hides and rejects conversation-tag reads and cross-tenant writes under the restricted role', async () => {
    const foreignTag = await pool!.query<{ id: string }>(
      `INSERT INTO "inbox_tags" ("organizationId","name") VALUES ($1,'foreign') RETURNING "id"`,
      [b],
    )
    const ownConversation = await pool!.query<{ id: string }>(
      `SELECT "id" FROM "inbox_conversations" WHERE "organizationId"=$1 LIMIT 1`,
      [a],
    )
    await tenant(a, async (client) => {
      expect(
        (
          await client.query(`SELECT * FROM "inbox_conversation_tags"`)
        ).rows.every((row) => row.organizationId === a),
      ).toBe(true)
      await expect(
        client.query(
          `INSERT INTO "inbox_conversation_tags" ("organizationId","conversationId","tagId") VALUES ($1,$2,$3)`,
          [a, ownConversation.rows[0]!.id, foreignTag.rows[0]!.id],
        ),
      ).rejects.toThrow()
      await expect(
        client.query(
          `INSERT INTO "inbox_conversation_tags" ("organizationId","conversationId","tagId") VALUES ($1,$2,$3)`,
          [b, ownConversation.rows[0]!.id, foreignTag.rows[0]!.id],
        ),
      ).rejects.toThrow()
    })
  })
})
