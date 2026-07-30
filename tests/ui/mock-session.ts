import type { Page, Route } from '@playwright/test'

export const testOrganization = {
  id: 'org-visual-regression',
  name: 'NEXO Test Workspace',
  slug: 'nexo-test-workspace',
  status: 'ACTIVE',
  locale: 'pt-BR',
  timezone: 'America/Sao_Paulo',
} as const

const permissions = [
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

export async function installMockSession(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: 'nexo_access',
      value: 'visual-test-cookie-not-a-real-token',
      url: 'http://127.0.0.1:3000',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  const handleApiRoute = async (route: Route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await fulfill(route, 204, undefined)
      return
    }
    const path = new URL(request.url()).pathname.replace(
      /^\/api(?=\/v1\/)/u,
      '',
    )
    if (path === '/v1/auth/me') {
      await fulfill(route, 200, {
        id: 'user-visual-regression',
        email: 'owner@nexo.test',
        name: 'Ana Nexo',
        status: 'ACTIVE',
        locale: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        activeOrganizationId: testOrganization.id,
      })
      return
    }
    if (path === '/v1/organizations') {
      await fulfill(route, 200, [
        {
          organization: testOrganization,
          role: { key: 'owner', name: 'Owner', permissions },
        },
      ])
      return
    }
    if (path === '/v1/roles') {
      await fulfill(route, 200, [
        { id: 'role-owner', key: 'owner', name: 'Owner' },
        { id: 'role-agent', key: 'agent', name: 'Agent' },
      ])
      return
    }
    if (path.includes('/memberships')) {
      await fulfill(route, 200, {
        items: [
          {
            id: 'membership-owner',
            status: 'ACTIVE',
            user: { name: 'Ana Nexo', email: 'owner@nexo.test' },
            role: { id: 'role-owner', key: 'owner', name: 'Owner' },
          },
        ],
        nextCursor: null,
      })
      return
    }
    if (path === '/v1/teams') {
      await fulfill(route, 200, {
        items: [
          {
            id: 'team-platform',
            name: 'Plataforma',
            description: 'Equipe de fundação do produto.',
            status: 'ACTIVE',
            members: [{ membershipId: 'membership-owner' }],
          },
        ],
        nextCursor: null,
      })
      return
    }
    if (path === '/v1/auth/sessions') {
      await fulfill(route, 200, {
        items: [
          {
            id: 'session-current',
            status: 'ACTIVE',
            userAgent: 'Chromium · teste visual',
            expiresAt: '2026-08-01T12:00:00.000Z',
          },
        ],
        nextCursor: null,
      })
      return
    }
    if (path === '/v1/audit-logs') {
      await fulfill(route, 200, {
        items: [
          {
            id: 'audit-login',
            action: 'auth.login.succeeded',
            resourceType: 'Session',
            createdAt: '2026-07-18T12:00:00.000Z',
          },
        ],
        nextCursor: null,
      })
      return
    }
    await fulfill(route, 200, { items: [], nextCursor: null })
  }
  await page.route('http://localhost:3001/v1/**', handleApiRoute)
  await page.route('http://127.0.0.1:3000/api/v1/**', handleApiRoute)
}

async function fulfill(
  route: Route,
  status: number,
  body: unknown,
): Promise<void> {
  await route.fulfill({
    status,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: {
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'content-type,x-csrf-token',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'access-control-allow-origin': 'http://127.0.0.1:3000',
      'content-type': 'application/json; charset=utf-8',
    },
  })
}
