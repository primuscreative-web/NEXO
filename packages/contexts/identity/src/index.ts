export type UserStatus = 'ACTIVE' | 'DISABLED'
export type SessionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED'
export type RefreshTokenStatus = 'ACTIVE' | 'ROTATED' | 'REVOKED'

export class IdentityRuleError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'IdentityRuleError'
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().normalize('NFKC').toLowerCase()
}

export interface PasswordAssessment {
  readonly valid: boolean
  readonly errors: readonly string[]
}

export function assessPassword(password: string): PasswordAssessment {
  const errors: string[] = []
  if (password.length < 12) errors.push('min_length')
  if (password.length > 128) errors.push('max_length')
  if (!/[a-z]/u.test(password)) errors.push('lowercase')
  if (!/[A-Z]/u.test(password)) errors.push('uppercase')
  if (!/[0-9]/u.test(password)) errors.push('number')
  return { valid: errors.length === 0, errors }
}

export function assertUserCanAuthenticate(input: {
  status: UserStatus
  lockedUntil?: Date | null
  now?: Date
}): void {
  const now = input.now ?? new Date()
  if (input.status !== 'ACTIVE')
    throw new IdentityRuleError('user_inactive', 'User cannot authenticate')
  if (input.lockedUntil && input.lockedUntil > now)
    throw new IdentityRuleError('credential_locked', 'Credential is locked')
}

export function assertRefreshCanRotate(input: {
  sessionStatus: SessionStatus
  sessionExpiresAt: Date
  tokenStatus: RefreshTokenStatus
  tokenExpiresAt: Date
  now?: Date
}): void {
  const now = input.now ?? new Date()
  if (input.sessionStatus !== 'ACTIVE' || input.sessionExpiresAt <= now)
    throw new IdentityRuleError('session_inactive', 'Session is inactive')
  if (input.tokenStatus !== 'ACTIVE')
    throw new IdentityRuleError(
      'refresh_reused',
      'Refresh token was already used',
    )
  if (input.tokenExpiresAt <= now)
    throw new IdentityRuleError('refresh_expired', 'Refresh token expired')
}

export function nextLockout(
  failedAttempts: number,
  now = new Date(),
): Date | null {
  if (failedAttempts < 5) return null
  const exponent = Math.min(failedAttempts - 5, 5)
  return new Date(now.getTime() + 30_000 * 2 ** exponent)
}
