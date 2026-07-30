import { describe, expect, it, vi } from 'vitest'
import {
  normalizeWhatsAppWebhook,
  WhatsAppCloudApiClient,
  type WhatsAppCloudConfig,
} from '../src/index.js'

const config: WhatsAppCloudConfig = {
  appId: 'app-1',
  accessToken: 'server-side-test-token',
  phoneNumberId: 'phone-1',
  businessAccountId: 'waba-1',
  graphApiVersion: 'v99.0',
}

describe('WhatsAppCloudApiClient', () => {
  it('probes both the phone and WABA without exposing credentials', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'phone-1',
            display_phone_number: '+5511999999999',
            verified_name: 'NEXO',
            quality_rating: 'GREEN',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'waba-1', name: 'NEXO WABA' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: 'app-1' }] }), {
          status: 200,
        }),
      )
    const result = await new WhatsAppCloudApiClient(config, fetcher).diagnose()
    expect(result).toMatchObject({
      reachable: true,
      phoneNumberId: 'phone-1',
      businessAccountId: 'waba-1',
      qualityRating: 'GREEN',
      webhookSubscribed: true,
    })
    expect(fetcher).toHaveBeenCalledTimes(3)
    for (const call of fetcher.mock.calls)
      expect(call[1]?.headers).toMatchObject({
        authorization: 'Bearer server-side-test-token',
      })
  })

  it('classifies an expired or invalid token without leaking provider text', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: 190, message: 'sensitive detail' } }),
          { status: 401 },
        ),
      )
    await expect(
      new WhatsAppCloudApiClient(config, fetcher).diagnose(),
    ).resolves.toEqual({ reachable: false, reason: 'unauthorized' })
  })

  it('sends a text message through the official messages endpoint', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), {
        status: 200,
      }),
    )
    await expect(
      new WhatsAppCloudApiClient(config, fetcher).sendText({
        to: '5511888888888',
        body: 'Olá',
      }),
    ).resolves.toEqual({ id: 'wamid.1' })
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      'https://graph.facebook.com/v99.0/phone-1/messages',
    )
  })
})

describe('normalizeWhatsAppWebhook', () => {
  it('normalizes text, media and delivery status events', () => {
    const events = normalizeWhatsAppWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'phone-1' },
                contacts: [
                  { wa_id: '5511777777777', profile: { name: 'Cliente' } },
                ],
                messages: [
                  {
                    id: 'wamid.in.1',
                    from: '5511777777777',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'Oi' },
                  },
                  {
                    id: 'wamid.in.2',
                    from: '5511777777777',
                    timestamp: '1700000001',
                    type: 'audio',
                    audio: { id: 'media-1', mime_type: 'audio/ogg' },
                  },
                ],
                statuses: [
                  {
                    id: 'wamid.out.1',
                    status: 'delivered',
                    timestamp: '1700000002',
                  },
                ],
              },
            },
          ],
        },
      ],
    })
    expect(events).toHaveLength(3)
    expect(events[0]).toMatchObject({
      kind: 'message',
      externalId: 'wamid.in.1',
      contactName: 'Cliente',
      body: 'Oi',
    })
    expect(events[1]).toMatchObject({
      kind: 'message',
      externalId: 'wamid.in.2',
      body: '[Áudio]',
      mediaId: 'media-1',
    })
    expect(events[2]).toMatchObject({
      kind: 'status',
      externalId: 'wamid.out.1',
      status: 'delivered',
    })
  })
})
