export const permissionKeys = [
  'organization.read',
  'organization.update',
  'membership.read',
  'membership.invite',
  'membership.update',
  'membership.revoke',
  'team.read',
  'team.create',
  'team.update',
  'team.delete',
  'role.read',
  'role.manage',
  'audit.read',
  'session.read',
  'session.revoke',
] as const

export type PermissionKey = (typeof permissionKeys)[number]
export type SystemRoleKey =
  | 'owner'
  | 'admin'
  | 'supervisor'
  | 'agent'
  | 'analyst'
  | 'developer'
  | 'finance'

const allPermissions = new Set<PermissionKey>(permissionKeys)
export const rolePermissions: Readonly<
  Record<SystemRoleKey, ReadonlySet<PermissionKey>>
> = {
  owner: allPermissions,
  admin: new Set(permissionKeys.filter((key) => key !== 'role.manage')),
  supervisor: new Set([
    'organization.read',
    'membership.read',
    'membership.invite',
    'team.read',
    'team.create',
    'team.update',
    'session.read',
  ]),
  agent: new Set(['organization.read', 'team.read']),
  analyst: new Set([
    'organization.read',
    'membership.read',
    'team.read',
    'audit.read',
  ]),
  developer: new Set(['organization.read', 'team.read']),
  finance: new Set(['organization.read']),
}

export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED'

export class AuthorizationDeniedError extends Error {
  constructor(readonly reason: string) {
    super('Action is not authorized')
    this.name = 'AuthorizationDeniedError'
  }
}

export function can(
  permissions: ReadonlySet<PermissionKey>,
  permission: PermissionKey,
): boolean {
  return permissions.has(permission)
}

export function assertAuthorized(input: {
  permission: PermissionKey
  permissions: ReadonlySet<PermissionKey>
  membershipStatus: MembershipStatus
  organizationStatus: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
}): void {
  if (input.membershipStatus !== 'ACTIVE')
    throw new AuthorizationDeniedError('membership_inactive')
  if (input.organizationStatus !== 'ACTIVE')
    throw new AuthorizationDeniedError('organization_inactive')
  if (!can(input.permissions, input.permission))
    throw new AuthorizationDeniedError('permission_missing')
}

export function assertTenant(expected: string, actual: string): void {
  if (expected !== actual) throw new AuthorizationDeniedError('tenant_mismatch')
}

export function assertMembershipTransition(
  current: MembershipStatus,
  next: MembershipStatus,
): void {
  const allowed: Readonly<
    Record<MembershipStatus, readonly MembershipStatus[]>
  > = {
    INVITED: ['ACTIVE', 'REVOKED'],
    ACTIVE: ['SUSPENDED', 'REVOKED'],
    SUSPENDED: ['ACTIVE', 'REVOKED'],
    REVOKED: [],
  }
  if (!allowed[current].includes(next))
    throw new AuthorizationDeniedError('invalid_membership_transition')
}

export function assertOwnerMutation(input: {
  targetRole: SystemRoleKey
  activeOwnerCount: number
  nextStatus?: MembershipStatus
  nextRole?: SystemRoleKey
}): void {
  const removesOwnership =
    input.targetRole === 'owner' &&
    (input.nextStatus === 'REVOKED' ||
      input.nextStatus === 'SUSPENDED' ||
      (input.nextRole !== undefined && input.nextRole !== 'owner'))
  if (removesOwnership && input.activeOwnerCount <= 1)
    throw new AuthorizationDeniedError('last_owner')
}

export function normalizeSlug(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
  if (slug.length < 3 || slug.length > 80)
    throw new Error('Slug must contain between 3 and 80 characters')
  return slug
}
