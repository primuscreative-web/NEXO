import { describe, expect, it } from 'vitest'
import { isEmailVerificationRequired } from '../src/phase1/phase1.service.js'

describe('email verification feature flag', () => {
  it('keeps email verification required by default', () => {
    expect(isEmailVerificationRequired({})).toBe(true)
  })

  it('disables email verification only when explicitly set to false', () => {
    expect(
      isEmailVerificationRequired({
        AUTH_EMAIL_VERIFICATION_REQUIRED: 'false',
      }),
    ).toBe(false)
    expect(
      isEmailVerificationRequired({
        AUTH_EMAIL_VERIFICATION_REQUIRED: 'true',
      }),
    ).toBe(true)
  })
})
