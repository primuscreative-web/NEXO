import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { WhatsAppWebhookProcessor } from '../../apps/preview-runtime/src/whatsapp-webhook.processor.js'

const { Pool } = pg
const connectionString = process.env.TEST_DATABASE_URL
const pool = connectionString ? new Pool({ connectionString, max: 2 }) : null
const configured = Boolean(pool)

afterEach(() => {
  for (const name of [
    'DATABASE_URL',
    'META_WHATSAPP_ORGANIZATION_ID',
    'META_WHATSAPP_PHONE_NUMBER_ID',
    'META_WHATSAPP_INBOX_NAME',
  ])
    Reflect.deleteProperty(process.env, name)
})

afterAll(async () => {
  await pool?.end()
})

describe.skipIf(!configured)('WhatsApp webhook persistence', () => {
  it('persists one inbound message and treats the replay as duplicate', async () => {
    const organizationId = randomUUID()
    await pool!.query(
      `INSERT INTO "organization_organizations" ("id","name","slug","updatedAt") VALUES ($1::uuid,'WhatsApp test','whatsapp-' || substr($1::uuid::text,1,8),now())`,
      [organizationId],
    )
    process.env.DATABASE_URL = connectionString
    process.env.META_WHATSAPP_ORGANIZATION_ID = organizationId
    process.env.META_WHATSAPP_PHONE_NUMBER_ID = 'phone-integration'
    process.env.META_WHATSAPP_INBOX_NAME = 'WhatsApp Integration'
    const processor = new WhatsAppWebhookProcessor()
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'phone-integration' },
                contacts: [
                  {
                    wa_id: '5511999999999',
                    profile: { name: 'Cliente WhatsApp' },
                  },
                ],
                messages: [
                  {
                    id: 'wamid.integration.inbound',
                    from: '5511999999999',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'Olá pelo WhatsApp' },
                  },
                ],
              },
            },
          ],
        },
      ],
    }
    await expect(processor.process(payload)).resolves.toMatchObject({
      processed: 1,
      duplicates: 0,
    })
    await expect(processor.process(payload)).resolves.toMatchObject({
      processed: 0,
      duplicates: 1,
    })

    const messages = await pool!.query<{
      direction: string
      status: string
      body: string
    }>(
      `SELECT "direction","status","body" FROM "inbox_messages" WHERE "organizationId"=$1 AND "externalId"='wamid.integration.inbound'`,
      [organizationId],
    )
    expect(messages.rows).toEqual([
      {
        direction: 'INBOUND',
        status: 'RECEIVED',
        body: 'Olá pelo WhatsApp',
      },
    ])
    expect(
      (
        await pool!.query(
          `SELECT "id" FROM "inbox_channel_events" WHERE "organizationId"=$1`,
          [organizationId],
        )
      ).rows,
    ).toHaveLength(1)
    expect(
      (
        await pool!.query(
          `SELECT "eventType" FROM "platform_outbox_events" WHERE "organizationId"=$1 AND "eventType"='MessageReceived'`,
          [organizationId],
        )
      ).rows,
    ).toHaveLength(1)
    await processor.onModuleDestroy()
  })
})
