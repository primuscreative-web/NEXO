import { randomUUID } from 'node:crypto'
import { SimulatorChannelProvider } from '../../packages/contexts/inbox/src/index.js'
import { InboxService } from '../../apps/api/src/inbox/inbox.service.js'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const { Pool } = pg
const connectionString = process.env.TEST_DATABASE_URL
const pool = connectionString ? new Pool({ connectionString, max: 2 }) : null
const configured = Boolean(pool)

async function createAuthorizedActor(organizationId: string, keys: string[]) {
  const userId = randomUUID()
  const roleId = randomUUID()
  const membershipId = randomUUID()
  await pool!.query(
    `INSERT INTO "identity_users" ("id","email","normalizedEmail","name","updatedAt") VALUES ($1,$2,$2,'Inbox actor',now())`,
    [userId, `${userId}@example.test`],
  )
  await pool!.query(
    `INSERT INTO "organization_roles" ("id","organizationId","key","name","updatedAt") VALUES ($1,$2,$3,'Inbox test role',now())`,
    [roleId, organizationId, `inbox-${roleId}`],
  )
  for (const key of keys) {
    const permission = await pool!.query<{ id: string }>(
      `INSERT INTO "organization_permissions" ("id","key","description") VALUES (gen_random_uuid(),$1,$1) ON CONFLICT ("key") DO UPDATE SET "description"=EXCLUDED."description" RETURNING "id"`,
      [key],
    )
    await pool!.query(
      `INSERT INTO "organization_role_permissions" ("organizationId","roleId","permissionId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [organizationId, roleId, permission.rows[0]!.id],
    )
  }
  await pool!.query(
    `INSERT INTO "organization_memberships" ("id","organizationId","userId","roleId","status","acceptedAt","updatedAt") VALUES ($1,$2,$3,$4,'ACTIVE',now(),now())`,
    [membershipId, organizationId, userId, roleId],
  )
  return { userId, roleId, membershipId }
}

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
  beforeAll(() => {
    process.env.DATABASE_URL = connectionString
  })
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
    await pool!.query(
      `UPDATE "inbox_conversations" SET "status"='CLOSED',"updatedAt"=now() WHERE "id"=$1 AND "status"='PENDING'`,
      [conversationId],
    )
    await pool!.query(
      `UPDATE "inbox_conversations" SET "status"='OPEN',"updatedAt"=now() WHERE "id"=$1 AND "status"='CLOSED'`,
      [conversationId],
    )
    await pool!.query(
      `DELETE FROM "inbox_conversation_tags" WHERE "organizationId"=$1 AND "conversationId"=$2 AND "tagId"=$3`,
      [organizationId, conversationId, tagId],
    )
    expect(
      (
        await pool!.query(
          `SELECT "id" FROM "inbox_conversation_tags" WHERE "conversationId"=$1`,
          [conversationId],
        )
      ).rows,
    ).toEqual([])
    expect(
      (
        await pool!.query(
          `SELECT "status" FROM "inbox_conversations" WHERE "id"=$1`,
          [conversationId],
        )
      ).rows[0]?.status,
    ).toBe('OPEN')
  })

  it('rolls back a tag association when its durable event cannot be written', async () => {
    const { organizationId, inboxId, contactId } = await bootstrap()
    const conversationId = randomUUID()
    const tagId = randomUUID()
    await pool!.query(
      `INSERT INTO "inbox_conversations" ("id","organizationId","inboxId","contactId","updatedAt") VALUES ($1,$2,$3,$4,now())`,
      [conversationId, organizationId, inboxId, contactId],
    )
    await pool!.query(
      `INSERT INTO "inbox_tags" ("id","organizationId","name") VALUES ($1,$2,'rollback')`,
      [tagId, organizationId],
    )
    await pool!.query('BEGIN')
    try {
      await pool!.query(
        `INSERT INTO "inbox_conversation_tags" ("organizationId","conversationId","tagId") VALUES ($1,$2,$3)`,
        [organizationId, conversationId, tagId],
      )
      await expect(
        pool!.query(
          `INSERT INTO "platform_outbox_events" ("id","idempotencyKey","eventType","eventVersion","source","correlationId","organizationId","aggregateId","payload","occurredAt") VALUES (gen_random_uuid(),NULL,'ConversationTagAdded',1,'nexo.inbox',$1,$2,$3,'{}',now())`,
          [randomUUID(), organizationId, conversationId],
        ),
      ).rejects.toThrow()
      await pool!.query('ROLLBACK')
    } catch (error) {
      await pool!.query('ROLLBACK')
      throw error
    }
    expect(
      (
        await pool!.query(
          `SELECT "id" FROM "inbox_conversation_tags" WHERE "conversationId"=$1`,
          [conversationId],
        )
      ).rows,
    ).toEqual([])
  })

  it('assigns and notes through the authorized InboxService', async () => {
    const { organizationId, inboxId, contactId } = await bootstrap()
    const conversationId = randomUUID()
    await pool!.query(
      `INSERT INTO "inbox_conversations" ("id","organizationId","inboxId","contactId","updatedAt") VALUES ($1,$2,$3,$4,now())`,
      [conversationId, organizationId, inboxId, contactId],
    )
    const actor = await createAuthorizedActor(organizationId, [
      'conversation.assign',
      'note.create',
    ])
    const assignee = await createAuthorizedActor(organizationId, [])
    const service = new InboxService()
    const principal = {
      userId: actor.userId,
      sessionId: randomUUID(),
      organizationId,
    }
    const context = { correlationId: randomUUID() }
    await service.updateConversation(
      principal,
      conversationId,
      { assigneeMembershipId: assignee.membershipId },
      context,
    )
    const note = await service.addNote(
      principal,
      conversationId,
      'Nota interna',
      { correlationId: randomUUID() },
    )
    expect(note.authorMembershipId).toBe(actor.membershipId)
    expect(
      (
        await pool!.query(
          `SELECT "assigneeMembershipId" FROM "inbox_conversations" WHERE "id"=$1`,
          [conversationId],
        )
      ).rows[0]?.assigneeMembershipId,
    ).toBe(assignee.membershipId)
    expect(
      (
        await pool!.query(
          `SELECT "eventType" FROM "platform_outbox_events" WHERE "organizationId"=$1 AND "aggregateId"=$2`,
          [organizationId, conversationId],
        )
      ).rows.map((row) => row.eventType),
    ).toEqual(
      expect.arrayContaining(['ConversationAssigned', 'InternalNoteCreated']),
    )
    await pool!.query(
      `UPDATE "platform_outbox_events" SET "status"='PUBLISHED',"publishedAt"=now() WHERE "organizationId"=$1 AND "aggregateId"=$2`,
      [organizationId, conversationId],
    )
  })

  it('rejects assignment without conversation.assign RolePermission', async () => {
    const { organizationId, inboxId, contactId } = await bootstrap()
    const conversationId = randomUUID()
    await pool!.query(
      `INSERT INTO "inbox_conversations" ("id","organizationId","inboxId","contactId","updatedAt") VALUES ($1,$2,$3,$4,now())`,
      [conversationId, organizationId, inboxId, contactId],
    )
    const denied = await createAuthorizedActor(organizationId, [])
    const principal = {
      userId: denied.userId,
      sessionId: randomUUID(),
      organizationId,
    }
    const service = new InboxService()
    await expect(
      service.updateConversation(
        principal,
        conversationId,
        { assigneeMembershipId: denied.membershipId },
        { correlationId: randomUUID() },
      ),
    ).rejects.toThrow()
    expect(
      (
        await pool!.query(
          `SELECT "assigneeMembershipId" FROM "inbox_conversations" WHERE "id"=$1`,
          [conversationId],
        )
      ).rows[0]?.assigneeMembershipId,
    ).toBeNull()
  })

  it('rejects notes without note.create RolePermission', async () => {
    const { organizationId, inboxId, contactId } = await bootstrap()
    const conversationId = randomUUID()
    await pool!.query(
      `INSERT INTO "inbox_conversations" ("id","organizationId","inboxId","contactId","updatedAt") VALUES ($1,$2,$3,$4,now())`,
      [conversationId, organizationId, inboxId, contactId],
    )
    const denied = await createAuthorizedActor(organizationId, [])
    const service = new InboxService()
    await expect(
      service.addNote(
        { userId: denied.userId, sessionId: randomUUID(), organizationId },
        conversationId,
        'nota sem permissao',
        { correlationId: randomUUID() },
      ),
    ).rejects.toThrow()
    expect(
      (
        await pool!.query(
          `SELECT "id" FROM "inbox_internal_notes" WHERE "conversationId"=$1`,
          [conversationId],
        )
      ).rows,
    ).toEqual([])
    expect(
      (
        await pool!.query(
          `SELECT "id" FROM "platform_outbox_events" WHERE "organizationId"=$1 AND "aggregateId"=$2 AND "eventType"='InternalNoteCreated'`,
          [organizationId, conversationId],
        )
      ).rows,
    ).toEqual([])
  })

  it('rejects a forbidden domain transition without an Outbox event', async () => {
    const { organizationId, inboxId, contactId } = await bootstrap()
    const conversationId = randomUUID()
    await pool!.query(
      `INSERT INTO "inbox_conversations" ("id","organizationId","inboxId","contactId","status","updatedAt") VALUES ($1,$2,$3,$4,'CLOSED',now())`,
      [conversationId, organizationId, inboxId, contactId],
    )
    const actor = await createAuthorizedActor(organizationId, [
      'conversation.update',
    ])
    const service = new InboxService()
    await expect(
      service.updateConversation(
        { userId: actor.userId, sessionId: randomUUID(), organizationId },
        conversationId,
        { status: 'PENDING' },
        { correlationId: randomUUID() },
      ),
    ).rejects.toThrow('invalid_conversation_transition')
    expect(
      (
        await pool!.query(
          `SELECT "status" FROM "inbox_conversations" WHERE "id"=$1`,
          [conversationId],
        )
      ).rows[0]?.status,
    ).toBe('CLOSED')
    expect(
      (
        await pool!.query(
          `SELECT "id" FROM "platform_outbox_events" WHERE "organizationId"=$1 AND "aggregateId"=$2 AND "eventType"='ConversationStatusChanged'`,
          [organizationId, conversationId],
        )
      ).rows,
    ).toEqual([])
  })

  it('blocks cross-tenant assignment, notes, and status changes through InboxService', async () => {
    const organizationA = await bootstrap()
    const organizationB = await bootstrap()
    const conversationA = randomUUID()
    const conversationB = randomUUID()
    await pool!.query(
      `INSERT INTO "inbox_conversations" ("id","organizationId","inboxId","contactId","updatedAt") VALUES ($1,$2,$3,$4,now()),($5,$6,$7,$8,now())`,
      [
        conversationA,
        organizationA.organizationId,
        organizationA.inboxId,
        organizationA.contactId,
        conversationB,
        organizationB.organizationId,
        organizationB.inboxId,
        organizationB.contactId,
      ],
    )
    const actorA = await createAuthorizedActor(organizationA.organizationId, [
      'conversation.assign',
      'conversation.update',
      'note.create',
    ])
    const assigneeB = await createAuthorizedActor(
      organizationB.organizationId,
      [],
    )
    const principalA = {
      userId: actorA.userId,
      sessionId: randomUUID(),
      organizationId: organizationA.organizationId,
    }
    const service = new InboxService()

    await expect(
      service.updateConversation(
        principalA,
        conversationA,
        { assigneeMembershipId: assigneeB.membershipId },
        { correlationId: randomUUID() },
      ),
    ).rejects.toThrow()
    await expect(
      service.addNote(principalA, conversationB, 'tentativa entre tenants', {
        correlationId: randomUUID(),
      }),
    ).rejects.toThrow()
    await expect(
      service.updateConversation(
        principalA,
        conversationB,
        { status: 'PENDING' },
        { correlationId: randomUUID() },
      ),
    ).rejects.toThrow()

    expect(
      (
        await pool!.query(
          `SELECT "assigneeMembershipId" FROM "inbox_conversations" WHERE "id"=$1`,
          [conversationA],
        )
      ).rows[0]?.assigneeMembershipId,
    ).toBeNull()
    expect(
      (
        await pool!.query(
          `SELECT "status" FROM "inbox_conversations" WHERE "id"=$1`,
          [conversationB],
        )
      ).rows[0]?.status,
    ).toBe('OPEN')
    expect(
      (
        await pool!.query(
          `SELECT "id" FROM "inbox_internal_notes" WHERE "conversationId"=$1`,
          [conversationB],
        )
      ).rows,
    ).toEqual([])
    expect(
      (
        await pool!.query(
          `SELECT "id" FROM "platform_outbox_events" WHERE "aggregateId" IN ($1,$2)`,
          [conversationA, conversationB],
        )
      ).rows,
    ).toEqual([])
  })
})
