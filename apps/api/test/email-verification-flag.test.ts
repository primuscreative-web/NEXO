import { describe, expect, it } from 'vitest'
import { isEmailVerificationRequired } from '../src/phase1/phase1.service.js'

describe('email verification feature flag', () => {
  it('keeps email verification required by default', () => {
    expect(isEmailVerificationRequired({})).toBe(true)
  })

  it('disables email verification in preview and development by default', () => {
    expect(isEmailVerificationRequired({ APP_ENV: 'preview' })).toBe(false)
    expect(isEmailVerificationRequired({ NODE_ENV: 'development' })).toBe(false)
  })

  it('allows the explicit flag to override the environment default', () => {
    expect(
      isEmailVerificationRequired({
        AUTH_EMAIL_VERIFICATION_REQUIRED: 'false',
      }),
    ).toBe(false)
    expect(
      isEmailVerificationRequired({
        AUTH_EMAIL_VERIFICATION_REQUIRED: 'true',
        APP_ENV: 'preview',
      }),
    ).toBe(true)
  })
})
