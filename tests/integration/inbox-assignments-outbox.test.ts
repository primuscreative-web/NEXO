import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const { Pool } = pg
const connectionString = process.env.TEST_DATABASE_URL
const pool = connectionString ? new Pool({ connectionString, max: 2 }) : null
const configured = Boolean(pool)
const organizationA = '40000000-0000-4000-8000-000000000001'
const organizationB = '40000000-0000-4000-8000-000000000002'
const memberA = '40000000-0000-4000-8000-000000000011'
const memberB = '40000000-0000-4000-8000-000000000012'

async function createConversation(organizationId: string) {
  return pool!.query<{ id: string }>(
    `WITH i AS (SELECT "id" FROM "inbox_inboxes" WHERE "organizationId"=$1 LIMIT 1), c AS (SELECT "id" FROM "crm_contacts" WHERE "organizationId"=$1 LIMIT 1) INSERT INTO "inbox_conversations" ("organizationId","inboxId","contactId","updatedAt") SELECT $1,i."id",c."id",now() FROM i,c RETURNING "id"`,
    [organizationId],
  )
}

beforeAll(async () => {
  if (!pool) return
  for (const [organizationId, slug, userId, membershipId] of [
    [
      organizationA,
      'inbox-assignment-a',
      '40000000-0000-4000-8000-000000000021',
      memberA,
    ],
    [
      organizationB,
      'inbox-assignment-b',
      '40000000-0000-4000-8000-000000000022',
      memberB,
    ],
  ] as const) {
    const roleId = randomUUID()
    await pool.query(
      `INSERT INTO "organization_organizations" ("id","name","slug","updatedAt") VALUES ($1,$2,$3,now()) ON CONFLICT ("id") DO NOTHING`,
      [organizationId, slug, slug],
    )
    await pool.query(
      `INSERT INTO "identity_users" ("id","email","normalizedEmail","name","updatedAt") VALUES ($1,$2,$2,'Test',now()) ON CONFLICT ("id") DO NOTHING`,
      [userId, `${slug}@example.test`],
    )
    await pool.query(
      `INSERT INTO "organization_roles" ("id","organizationId","key","name","updatedAt") VALUES ($1,$2,'test-owner','Test owner',now()) ON CONFLICT ("organizationId","key") DO NOTHING`,
      [roleId, organizationId],
    )
    const role = await pool.query<{ id: string }>(
      `SELECT "id" FROM "organization_roles" WHERE "organizationId"=$1 AND "key"='test-owner'`,
      [organizationId],
    )
    await pool.query(
      `INSERT INTO "organization_memberships" ("id","organizationId","userId","roleId","status","acceptedAt","updatedAt") VALUES ($1,$2,$3,$4,'ACTIVE',now(),now()) ON CONFLICT ("organizationId","userId") DO NOTHING`,
      [membershipId, organizationId, userId, role.rows[0]!.id],
    )
    await pool.query(
      `INSERT INTO "inbox_inboxes" ("id","organizationId","name","updatedAt") VALUES (gen_random_uuid(),$1,'Inbox',now()) ON CONFLICT DO NOTHING; INSERT INTO "crm_contacts" ("id","organizationId","name","updatedAt") VALUES (gen_random_uuid(),$1,'Contact',now()) ON CONFLICT DO NOTHING;`,
      [organizationId],
    )
  }
})

afterAll(async () => {
  await pool?.end()
})

describe.skipIf(!configured)(
  'Inbox assignments and transactional Outbox',
  () => {
    it('persists a tenant-safe assignment with its Outbox event', async () => {
      const conversation = await createConversation(organizationA)
      const eventId = randomUUID()
      await pool!.query('BEGIN')
      try {
        await pool!.query(
          `UPDATE "inbox_conversations" SET "assigneeMembershipId"=$1,"updatedAt"=now() WHERE "id"=$2 AND "organizationId"=$3`,
          [memberA, conversation.rows[0]!.id, organizationA],
        )
        await pool!.query(
          `INSERT INTO "platform_outbox_events" ("id","idempotencyKey","eventType","eventVersion","source","correlationId","organizationId","aggregateId","payload","occurredAt") VALUES ($1,$2,'ConversationAssigned',1,'nexo.inbox',$1,$3,$4,$5,now())`,
          [
            eventId,
            `assignment:${eventId}`,
            organizationA,
            conversation.rows[0]!.id,
            JSON.stringify({
              aggregateId: conversation.rows[0]!.id,
              assigneeMembershipId: memberA,
            }),
          ],
        )
        await pool!.query('COMMIT')
      } catch (error) {
        await pool!.query('ROLLBACK')
        throw error
      }
      await expect(
        pool!.query(
          `SELECT "assigneeMembershipId" FROM "inbox_conversations" WHERE "id"=$1`,
          [conversation.rows[0]!.id],
        ),
      ).resolves.toMatchObject({ rows: [{ assigneeMembershipId: memberA }] })
      await expect(
        pool!.query(
          `SELECT "eventType","organizationId","aggregateId" FROM "platform_outbox_events" WHERE "id"=$1`,
          [eventId],
        ),
      ).resolves.toMatchObject({
        rows: [
          {
            eventType: 'ConversationAssigned',
            organizationId: organizationA,
            aggregateId: conversation.rows[0]!.id,
          },
        ],
      })
    })

    it('rejects assignments that cross tenant boundaries and leaves no partial event', async () => {
      const conversation = await createConversation(organizationA)
      await expect(
        pool!.query(
          `UPDATE "inbox_conversations" SET "assigneeMembershipId"=$1 WHERE "id"=$2`,
          [memberB, conversation.rows[0]!.id],
        ),
      ).rejects.toThrow()
      expect(
        (
          await pool!.query(
            `SELECT "assigneeMembershipId" FROM "inbox_conversations" WHERE "id"=$1`,
            [conversation.rows[0]!.id],
          )
        ).rows[0]?.assigneeMembershipId,
      ).toBeNull()
    })

    it('rolls back an assignment and Outbox write together', async () => {
      const conversation = await createConversation(organizationA)
      const eventId = randomUUID()
      await pool!.query('BEGIN')
      await pool!.query(
        `UPDATE "inbox_conversations" SET "assigneeMembershipId"=$1 WHERE "id"=$2`,
        [memberA, conversation.rows[0]!.id],
      )
      await pool!.query(
        `INSERT INTO "platform_outbox_events" ("id","idempotencyKey","eventType","eventVersion","source","correlationId","organizationId","aggregateId","payload","occurredAt") VALUES ($1,$2,'ConversationAssigned',1,'nexo.inbox',$1,$3,$4,'{}',now())`,
        [
          eventId,
          `rollback:${eventId}`,
          organizationA,
          conversation.rows[0]!.id,
        ],
      )
      await pool!.query('ROLLBACK')
      expect(
        (
          await pool!.query(
            `SELECT "assigneeMembershipId" FROM "inbox_conversations" WHERE "id"=$1`,
            [conversation.rows[0]!.id],
          )
        ).rows[0]?.assigneeMembershipId,
      ).toBeNull()
      expect(
        (
          await pool!.query(
            `SELECT "id" FROM "platform_outbox_events" WHERE "id"=$1`,
            [eventId],
          )
        ).rows,
      ).toEqual([])
    })
  },
)
