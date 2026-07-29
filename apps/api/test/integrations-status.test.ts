import { afterEach, describe, expect, it } from 'vitest'
import { IntegrationsService } from '../src/integrations/integrations.service.js'

const metaNames = [
  'META_APP_ID',
  'META_APP_SECRET',
  'META_WHATSAPP_ACCESS_TOKEN',
  'META_WHATSAPP_PHONE_NUMBER_ID',
  'META_WHATSAPP_BUSINESS_ACCOUNT_ID',
  'META_WEBHOOK_VERIFY_TOKEN',
] as const

afterEach(() => {
  for (const name of metaNames) Reflect.deleteProperty(process.env, name)
})

describe('integration diagnostics', () => {
  it('does not trust prototype status when credentials are absent', () => {
    const whatsapp = new IntegrationsService()
      .list()
      .items.find((item) => item.id === 'whatsapp')
    expect(whatsapp).toMatchObject({
      status: 'not_configured',
      backendImplemented: true,
      credentialPresent: false,
      providerReachable: false,
      webhookHealthy: false,
    })
  })

  it('does not call an integration connected from environment presence alone', () => {
    for (const name of metaNames) process.env[name] = 'masked-test-value'
    const whatsapp = new IntegrationsService()
      .list()
      .items.find((item) => item.id === 'whatsapp')
    expect(whatsapp).toMatchObject({
      status: 'configuration_incomplete',
      credentialPresent: true,
      providerReachable: false,
      webhookHealthy: false,
    })
  })

  it('classifies unapproved Stitch cards as disabled', () => {
    const items = new IntegrationsService().list().items
    for (const id of ['slack', 'salesforce', 'hubspot', 'shopify', 'stripe'])
      expect(items.find((item) => item.id === id)?.status).toBe('disabled')
  })
})
