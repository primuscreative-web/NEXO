import { afterEach, describe, expect, it } from 'vitest'
import { WhatsAppWebhookProcessor } from '../src/whatsapp-webhook.processor.js'

afterEach(() => {
  for (const name of [
    'DATABASE_URL',
    'META_WHATSAPP_ORGANIZATION_ID',
    'META_WHATSAPP_PHONE_NUMBER_ID',
  ])
    Reflect.deleteProperty(process.env, name)
})

describe('WhatsAppWebhookProcessor', () => {
  it('reports an unconfigured processor without touching a database', async () => {
    await expect(new WhatsAppWebhookProcessor().process({})).resolves.toEqual({
      configured: false,
      processed: 0,
      duplicates: 0,
      ignored: 0,
    })
  })

  it('ignores events for another phone number before database access', async () => {
    process.env.DATABASE_URL = 'postgresql://unused'
    process.env.META_WHATSAPP_ORGANIZATION_ID =
      '00000000-0000-4000-8000-000000000001'
    process.env.META_WHATSAPP_PHONE_NUMBER_ID = 'phone-expected'
    const processor = new WhatsAppWebhookProcessor()
    await expect(
      processor.process({
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                field: 'messages',
                value: {
                  metadata: { phone_number_id: 'phone-other' },
                  messages: [
                    {
                      id: 'wamid.1',
                      from: '5511999999999',
                      type: 'text',
                      text: { body: 'Oi' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    ).resolves.toEqual({
      configured: true,
      processed: 0,
      duplicates: 0,
      ignored: 1,
    })
  })
})
