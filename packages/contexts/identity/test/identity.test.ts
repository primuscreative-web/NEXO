import { describe, expect, it } from 'vitest'
import {
  IdentityRuleError,
  assessPassword,
  assertRefreshCanRotate,
  assertUserCanAuthenticate,
  nextLockout,
  normalizeEmail,
} from '../src/index.js'

describe('Identity rules', () => {
  it('normalizes e-mail and enforces password rules', () => {
    expect(normalizeEmail('  Pessoa@Example.COM ')).toBe('pessoa@example.com')
    expect(assessPassword('short').valid).toBe(false)
    expect(assessPassword('Nexo-secure-2026').valid).toBe(true)
  })

  it('blocks disabled or temporarily locked users', () => {
    expect(() => assertUserCanAuthenticate({ status: 'DISABLED' })).toThrow(
      IdentityRuleError,
    )
    expectIdentityCode(
      () =>
        assertUserCanAuthenticate({
          status: 'ACTIVE',
          lockedUntil: new Date('2030-01-01'),
          now: new Date('2029-01-01'),
        }),
      'credential_locked',
    )
  })

  it('detects refresh reuse and expiry', () => {
    expectIdentityCode(
      () =>
        assertRefreshCanRotate({
          sessionStatus: 'ACTIVE',
          sessionExpiresAt: new Date('2030-01-01'),
          tokenStatus: 'ROTATED',
          tokenExpiresAt: new Date('2030-01-01'),
          now: new Date('2029-01-01'),
        }),
      'refresh_reused',
    )
  })

  it('applies bounded exponential credential lockout', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    expect(nextLockout(4, now)).toBeNull()
    expect(nextLockout(5, now)?.toISOString()).toBe('2026-01-01T00:00:30.000Z')
    expect(nextLockout(20, now)?.toISOString()).toBe('2026-01-01T00:16:00.000Z')
  })
})

function expectIdentityCode(operation: () => void, code: string): void {
  try {
    operation()
    throw new Error('Expected identity rule to fail')
  } catch (error) {
    expect(error).toBeInstanceOf(IdentityRuleError)
    expect((error as IdentityRuleError).code).toBe(code)
  }
}
