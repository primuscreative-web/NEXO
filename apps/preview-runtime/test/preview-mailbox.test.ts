import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Phase1Service } from '@nexo/api/preview'
import { PreviewMailboxController } from '../src/preview-mailbox.controller.js'

afterEach(() => vi.unstubAllEnvs())

describe('Preview mailbox capture', () => {
  const key = 'preview-mailbox-test-key-32-characters'
  const phase1 = {
    emails: {
      messages: [
        {
          to: 'synthetic@nexo.preview.invalid',
          template: 'reset-password',
          parameters: { token: 'opaque-reset-token' },
        },
      ],
    },
  } as unknown as Phase1Service

  it('returns only the reset path to an authorized Preview caller', () => {
    vi.stubEnv('APP_ENV', 'preview')
    vi.stubEnv('PREVIEW_MAILBOX_ACCESS_KEY', key)
    const controller = new PreviewMailboxController(phase1)

    expect(controller.resetLink('synthetic@nexo.preview.invalid', key)).toEqual(
      { path: '/reset-password?token=opaque-reset-token' },
    )
  })

  it.each([
    ['production', key],
    ['preview', 'wrong-key-with-the-same-safe-length'],
  ])('fails closed in %s with the supplied key', (environment, supplied) => {
    vi.stubEnv('APP_ENV', environment)
    vi.stubEnv('PREVIEW_MAILBOX_ACCESS_KEY', key)
    const controller = new PreviewMailboxController(phase1)

    expect(() =>
      controller.resetLink('synthetic@nexo.preview.invalid', supplied),
    ).toThrow('Not found')
  })
})
