import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MetaWebhookService } from '../src/meta-webhook.service.js'

describe('MetaWebhookService', () => {
  beforeEach(() => {
    process.env.META_APP_SECRET = 'test-app-secret'
    process.env.META_WEBHOOK_VERIFY_TOKEN = 'test-verify-token'
  })

  afterEach(() => {
    Reflect.deleteProperty(process.env, 'META_APP_SECRET')
    Reflect.deleteProperty(process.env, 'META_WEBHOOK_VERIFY_TOKEN')
  })

  it('accepts only the configured verification token', () => {
    const service = new MetaWebhookService()
    expect(
      service.verifyChallenge('subscribe', 'test-verify-token', '42'),
    ).toBe('42')
    expect(service.verifyChallenge('subscribe', 'wrong', '42')).toBeNull()
  })

  it('validates X-Hub-Signature-256 and rejects a forged signature', () => {
    const service = new MetaWebhookService()
    const body = Buffer.from('{"object":"whatsapp_business_account"}')
    const signature = `sha256=${createHmac('sha256', 'test-app-secret').update(body).digest('hex')}`
    expect(service.accept(body, signature)).toEqual({
      accepted: true,
      duplicate: false,
    })
    expect(() => service.accept(body, 'sha256=forged')).toThrow(
      'META_SIGNATURE_INVALID',
    )
  })

  it('treats a repeated signed delivery as an idempotent duplicate', () => {
    const service = new MetaWebhookService()
    const body = Buffer.from('{"entry":[{"id":"delivery-1"}]}')
    const signature = `sha256=${createHmac('sha256', 'test-app-secret').update(body).digest('hex')}`
    expect(service.accept(body, signature).duplicate).toBe(false)
    expect(service.accept(body, signature).duplicate).toBe(true)
  })
})
