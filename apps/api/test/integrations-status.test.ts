import { afterEach, describe, expect, it, vi } from 'vitest'
import { IntegrationsService } from '../src/integrations/integrations.service.js'

const metaNames = [
  'META_APP_ID',
  'META_APP_SECRET',
  'META_WHATSAPP_ACCESS_TOKEN',
  'META_WHATSAPP_PHONE_NUMBER_ID',
  'META_WHATSAPP_BUSINESS_ACCOUNT_ID',
  'META_WHATSAPP_ORGANIZATION_ID',
  'META_GRAPH_API_VERSION',
  'META_WEBHOOK_VERIFY_TOKEN',
] as const

afterEach(() => {
  vi.restoreAllMocks()
  for (const name of metaNames) Reflect.deleteProperty(process.env, name)
})

describe('integration diagnostics', () => {
  it('does not trust prototype status when credentials are absent', async () => {
    const whatsapp = (await new IntegrationsService().list()).items.find(
      (item) => item.id === 'whatsapp',
    )
    expect(whatsapp).toMatchObject({
      status: 'not_configured',
      backendImplemented: true,
      credentialPresent: false,
      providerReachable: false,
      webhookHealthy: false,
    })
  })

  it('does not call an integration connected from environment presence alone', async () => {
    for (const name of metaNames) process.env[name] = 'masked-test-value'
    process.env.META_GRAPH_API_VERSION = 'v99.0'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 401 }),
    )
    const whatsapp = (await new IntegrationsService().list()).items.find(
      (item) => item.id === 'whatsapp',
    )
    expect(whatsapp).toMatchObject({
      status: 'token_expired',
      credentialPresent: true,
      providerReachable: false,
      webhookHealthy: false,
    })
  })

  it('marks WhatsApp connected only after Meta confirms account and webhook', async () => {
    for (const name of metaNames) process.env[name] = 'masked-test-value'
    process.env.META_APP_ID = 'app-1'
    process.env.META_WHATSAPP_PHONE_NUMBER_ID = 'phone-1'
    process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID = 'waba-1'
    process.env.META_GRAPH_API_VERSION = 'v99.0'
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'phone-1' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'waba-1' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: 'app-1' }] }), {
          status: 200,
        }),
      )
    const whatsapp = (await new IntegrationsService().list()).items.find(
      (item) => item.id === 'whatsapp',
    )
    expect(whatsapp).toMatchObject({
      status: 'connected',
      credentialPresent: true,
      providerReachable: true,
      webhookHealthy: true,
    })
  })

  it('classifies unapproved Stitch cards as disabled', async () => {
    const items = (await new IntegrationsService().list()).items
    for (const id of ['slack', 'salesforce', 'hubspot', 'shopify', 'stripe'])
      expect(items.find((item) => item.id === id)?.status).toBe('disabled')
  })
})
