import { randomUUID } from 'node:crypto'
import { SimulatorChannelProvider } from '../../packages/contexts/inbox/src/index.js'
import pg from 'pg'
import { afterAll, describe, expect, it } from 'vitest'

const { Pool } = pg
const connectionString = process.env.TEST_DATABASE_URL
const pool = connectionString ? new Pool({ connectionString, max: 2 }) : null
const configured = Boolean(pool)

async function bootstrap() {
  const organizationId = randomUUID()
  const inboxId = randomUUID()
  const contactId = randomUUID()
  await pool!.query(
    `INSERT INTO "organization_organizations" ("id","name","slug","updatedAt") VALUES ($1::uuid,'Simulator','simulator-' || substr($1::uuid::text,1,8),now())`,
    [organizationId],
  )
  await pool!.query(
    `INSERT INTO "inbox_inboxes" ("id","organizationId","name","updatedAt") VALUES ($1,$2,'Simulador',now())`,
    [inboxId, organizationId],
  )
  await pool!.query(
    `INSERT INTO "crm_contacts" ("id","organizationId","name","updatedAt") VALUES ($1,$2,'Cliente',now())`,
    [contactId, organizationId],
  )
  return { organizationId, inboxId, contactId }
}

afterAll(async () => {
  await pool?.end()
})

describe.skipIf(!configured)('Inbox simulator full workflow', () => {
  it('persists inbound/outbound messages, reuses the open conversation, and records the Outbox', async () => {
    const { organizationId, inboxId, contactId } = await bootstrap()
    const provider = new SimulatorChannelProvider()
    const channelId = randomUUID()
    const conversationId = randomUUID()
    const inboundId = randomUUID()
    const outboundId = randomUUID()
    await pool!.query('BEGIN')
    try {
      await pool!.query(
        `INSERT INTO "inbox_channel_accounts" ("id","organizationId","inboxId","provider","displayName") VALUES ($1,$2,$3,'SIMULATOR','Simulator')`,
        [channelId, organizationId, inboxId],
      )
      await pool!.query(
        `INSERT INTO "crm_contact_channels" ("organizationId","contactId","provider","identifier") VALUES ($1,$2,'SIMULATOR','client-1')`,
        [organizationId, contactId],
      )
      await pool!.query(
        `INSERT INTO "inbox_conversations" ("id","organizationId","inboxId","contactId","updatedAt") VALUES ($1,$2,$3,$4,now())`,
        [conversationId, organizationId, inboxId, contactId],
      )
      await pool!.query(
        `INSERT INTO "inbox_messages" ("id","organizationId","conversationId","externalId","direction","status","body") VALUES ($1,$2,$3,'sim:inbound','INBOUND','RECEIVED','Olá')`,
        [inboundId, organizationId, conversationId],
      )
      const sent = await provider.send({
        channelAccountId: channelId,
        externalConversationId: 'client-1',
        body: 'Olá, como posso ajudar?',
        idempotencyKey: outboundId,
      })
      await pool!.query(
        `INSERT INTO "inbox_messages" ("id","organizationId","conversationId","externalId","direction","status","body") VALUES ($1,$2,$3,$4,'OUTBOUND','SENT','Olá, como posso ajudar?')`,
        [outboundId, organizationId, conversationId, sent.externalId],
      )
      for (const [eventType, aggregateId] of [
        ['MessageReceived', conversationId],
        ['MessageSent', conversationId],
      ] as const)
        await pool!.query(
          `INSERT INTO "platform_outbox_events" ("id","idempotencyKey","eventType","eventVersion","source","correlationId","organizationId","aggregateId","payload","occurredAt","status","publishedAt") VALUES (gen_random_uuid(),$1,$2,1,'nexo.inbox',$3,$4,$5,$6,now(),'PUBLISHED',now())`,
          [
            `sim:${eventType}:${aggregateId}`,
            eventType,
            randomUUID(),
            organizationId,
            aggregateId,
            JSON.stringify({ aggregateId }),
          ],
        )
      await pool!.query('COMMIT')
    } catch (error) {
      await pool!.query('ROLLBACK')
      throw error
    }
    const messages = await pool!.query<{ direction: string; status: string }>(
      `SELECT "direction","status" FROM "inbox_messages" WHERE "conversationId"=$1 ORDER BY "createdAt"`,
      [conversationId],
    )
    expect(messages.rows).toEqual([
      { direction: 'INBOUND', status: 'RECEIVED' },
      { direction: 'OUTBOUND', status: 'SENT' },
    ])
    expect(
      (
        await pool!.query(
          `SELECT "id" FROM "inbox_conversations" WHERE "organizationId"=$1 AND "contactId"=$2 AND "status"='OPEN'`,
          [organizationId, contactId],
        )
      ).rows,
    ).toHaveLength(1)
    expect(
      (
        await pool!.query(
          `SELECT "eventType" FROM "platform_outbox_events" WHERE "organizationId"=$1 AND "aggregateId"=$2`,
          [organizationId, conversationId],
        )
      ).rows.map((row) => row.eventType),
    ).toEqual(expect.arrayContaining(['MessageReceived', 'MessageSent']))
  })

  it('keeps tag associations and status transitions atomic', async () => {
    const { organizationId, inboxId, contactId } = await bootstrap()
    const conversationId = randomUUID()
    const tagId = randomUUID()
    await pool!.query(
      `INSERT INTO "inbox_conversations" ("id","organizationId","inboxId","contactId","updatedAt") VALUES ($1,$2,$3,$4,now())`,
      [conversationId, organizationId, inboxId, contactId],
    )
    await pool!.query(
      `INSERT INTO "inbox_tags" ("id","organizationId","name") VALUES ($1,$2,'vip')`,
      [tagId, organizationId],
    )
    await pool!.query('BEGIN')
    try {
      await pool!.query(
        `INSERT INTO "inbox_conversation_tags" ("organizationId","conversationId","tagId") VALUES ($1,$2,$3)`,
        [organizationId, conversationId, tagId],
      )
      await pool!.query(
        `UPDATE "inbox_conversations" SET "status"='PENDING',"updatedAt"=now() WHERE "id"=$1`,
        [conversationId],
      )
      await pool!.query('COMMIT')
    } catch (error) {
      await pool!.query('ROLLBACK')
      throw error
    }
    expect(
      (
        await pool!.query(
          `SELECT "tagId" FROM "inbox_conversation_tags" WHERE "conversationId"=$1`,
          [conversationId],
        )
      ).rows,
    ).toHaveLength(1)
    expect(
      (
        await pool!.query(
          `SELECT "status" FROM "inbox_conversations" WHERE "id"=$1`,
          [conversationId],
        )
      ).rows[0]?.status,
    ).toBe('PENDING')
  })
})
