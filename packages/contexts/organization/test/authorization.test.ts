import { describe, expect, it } from 'vitest'
import {
  AuthorizationDeniedError,
  assertAuthorized,
  assertMembershipTransition,
  assertOwnerMutation,
  assertTenant,
  normalizeSlug,
  rolePermissions,
  permissionKeys,
  type SystemRoleKey,
} from '../src/index.js'

describe('Organization authorization', () => {
  const roles = Object.keys(rolePermissions) as SystemRoleKey[]

  it.each(
    roles.flatMap((role) =>
      permissionKeys.map((permission) => ({ role, permission })),
    ),
  )(
    'applies the canonical $role/$permission matrix',
    ({ role, permission }) => {
      const operation = () =>
        assertAuthorized({
          permission,
          permissions: rolePermissions[role],
          membershipStatus: 'ACTIVE',
          organizationStatus: 'ACTIVE',
        })
      if (rolePermissions[role].has(permission)) expect(operation).not.toThrow()
      else expect(operation).toThrow(AuthorizationDeniedError)
    },
  )

  it('is deny-by-default and blocks inactive membership', () => {
    expect(() =>
      assertAuthorized({
        permission: 'role.manage',
        permissions: rolePermissions.admin,
        membershipStatus: 'ACTIVE',
        organizationStatus: 'ACTIVE',
      }),
    ).toThrow(AuthorizationDeniedError)
    expectAuthorizationReason(
      () =>
        assertAuthorized({
          permission: 'organization.read',
          permissions: rolePermissions.owner,
          membershipStatus: 'SUSPENDED',
          organizationStatus: 'ACTIVE',
        }),
      'membership_inactive',
    )
  })

  it('prevents cross-tenant context and last-owner removal', () => {
    expect(() => assertTenant('org-a', 'org-b')).toThrow(
      AuthorizationDeniedError,
    )
    expectAuthorizationReason(
      () =>
        assertOwnerMutation({
          targetRole: 'owner',
          activeOwnerCount: 1,
          nextStatus: 'REVOKED',
        }),
      'last_owner',
    )
  })

  it('allows only valid membership transitions', () => {
    expect(() => assertMembershipTransition('INVITED', 'ACTIVE')).not.toThrow()
    expect(() => assertMembershipTransition('REVOKED', 'ACTIVE')).toThrow(
      AuthorizationDeniedError,
    )
  })

  it('normalizes safe organization slugs', () => {
    expect(normalizeSlug('  Clínica São Gabriel ')).toBe('clinica-sao-gabriel')
  })
})

function expectAuthorizationReason(
  operation: () => void,
  reason: string,
): void {
  try {
    operation()
    throw new Error('Expected authorization to fail')
  } catch (error) {
    expect(error).toBeInstanceOf(AuthorizationDeniedError)
    expect((error as AuthorizationDeniedError).reason).toBe(reason)
  }
}
