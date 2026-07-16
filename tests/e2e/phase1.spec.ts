import { expect, test, type APIRequestContext } from '@playwright/test'

const configured = Boolean(process.env.TEST_DATABASE_URL)
const api = 'http://127.0.0.1:3001'
const suffix = Date.now().toString(36)

async function csrf(request: APIRequestContext): Promise<string> {
  const state = await request.storageState()
  return (
    state.cookies.find((cookie) => cookie.name === 'nexo_csrf')?.value ?? ''
  )
}

async function mutation(
  request: APIRequestContext,
  path: string,
  options: { method?: 'post' | 'patch' | 'delete'; data?: object } = {},
) {
  return request[options.method ?? 'post'](`${api}${path}`, {
    data: options.data,
    headers: { 'x-csrf-token': await csrf(request) },
  })
}

async function registerAndVerify(
  request: APIRequestContext,
  input: { email: string; name: string; password: string },
) {
  const registration = await request.post(`${api}/v1/auth/register`, {
    data: input,
  })
  expect(registration.status()).toBe(201)
  const body = (await registration.json()) as { verificationToken: string }
  expect(body.verificationToken).toBeTruthy()
  expect(
    (
      await request.post(`${api}/v1/auth/verify-email`, {
        data: { token: body.verificationToken },
      })
    ).status(),
  ).toBe(204)
}

test.describe('Phase 1 critical journey', () => {
  test.skip(!configured, 'requires disposable PostgreSQL/Redis from CI')
  test.describe.configure({ mode: 'serial' })

  test('register, authenticate, organize, authorize and audit', async ({
    playwright,
  }) => {
    const owner = await playwright.request.newContext()
    const member = await playwright.request.newContext()
    const existing = await playwright.request.newContext()
    const ownerEmail = `owner-${suffix}@example.test`
    const memberEmail = `member-${suffix}@example.test`
    const existingEmail = `existing-${suffix}@example.test`
    const password = 'Nexo-Secure-Password-2026'

    await registerAndVerify(owner, {
      email: ownerEmail,
      name: 'Owner E2E',
      password,
    })

    const login = await owner.post(`${api}/v1/auth/login`, {
      data: { email: ownerEmail, password },
    })
    expect(login.ok()).toBeTruthy()
    const refresh = await mutation(owner, '/v1/auth/refresh')
    expect(refresh.ok()).toBeTruthy()

    const organizationResponse = await mutation(owner, '/v1/organizations', {
      data: { name: `Empresa ${suffix}`, slug: `empresa-${suffix}` },
    })
    expect(organizationResponse.status()).toBe(201)
    const organization = (await organizationResponse.json()) as { id: string }
    expect(
      (
        await mutation(owner, `/v1/organizations/${organization.id}/select`)
      ).ok(),
    ).toBeTruthy()

    const rolesResponse = await owner.get(`${api}/v1/roles`)
    expect(rolesResponse.ok()).toBeTruthy()
    const roles = (await rolesResponse.json()) as { id: string; key: string }[]
    const agentRole = roles.find((role) => role.key === 'agent')!

    const invitationResponse = await mutation(
      owner,
      `/v1/organizations/${organization.id}/invitations`,
      { data: { email: memberEmail, roleId: agentRole.id } },
    )
    expect(invitationResponse.status()).toBe(201)
    const invitation = (await invitationResponse.json()) as { token: string }

    await registerAndVerify(member, {
      email: memberEmail,
      name: 'New Member E2E',
      password,
    })
    await member.post(`${api}/v1/auth/login`, {
      data: { email: memberEmail, password },
    })
    const accepted = await mutation(
      member,
      `/v1/invitations/${invitation.token}/accept`,
    )
    expect(accepted.ok()).toBeTruthy()
    expect(
      (
        await mutation(member, `/v1/organizations/${organization.id}/select`)
      ).ok(),
    ).toBeTruthy()

    const forbiddenInvite = await mutation(
      member,
      `/v1/organizations/${organization.id}/invitations`,
      {
        data: {
          email: `forbidden-${suffix}@example.test`,
          roleId: agentRole.id,
        },
      },
    )
    expect(forbiddenInvite.status()).toBe(403)

    await registerAndVerify(existing, {
      email: existingEmail,
      name: 'Existing Member E2E',
      password,
    })
    await existing.post(`${api}/v1/auth/login`, {
      data: { email: existingEmail, password },
    })
    const existingInvitationResponse = await mutation(
      owner,
      `/v1/organizations/${organization.id}/invitations`,
      { data: { email: existingEmail, roleId: agentRole.id } },
    )
    const existingInvitation = (await existingInvitationResponse.json()) as {
      token: string
    }
    expect(
      (
        await mutation(
          existing,
          `/v1/invitations/${existingInvitation.token}/accept`,
        )
      ).ok(),
    ).toBeTruthy()

    const membershipsResponse = await owner.get(
      `${api}/v1/organizations/${organization.id}/memberships`,
    )
    const memberships = (await membershipsResponse.json()) as {
      id: string
      user: { email: string }
    }[]
    const memberMembership = memberships.find(
      (membership) => membership.user.email === memberEmail,
    )!
    const teamResponse = await mutation(owner, '/v1/teams', {
      data: { name: `Equipe ${suffix}` },
    })
    const team = (await teamResponse.json()) as { id: string }
    expect(
      (
        await mutation(owner, `/v1/teams/${team.id}/members`, {
          data: { membershipId: memberMembership.id },
        })
      ).ok(),
    ).toBeTruthy()

    const secondOrganizationResponse = await mutation(
      owner,
      '/v1/organizations',
      {
        data: { name: `Outra ${suffix}`, slug: `outra-${suffix}` },
      },
    )
    const secondOrganization = (await secondOrganizationResponse.json()) as {
      id: string
    }
    await mutation(owner, `/v1/organizations/${secondOrganization.id}/select`)
    expect(
      (await owner.get(`${api}/v1/organizations/${organization.id}`)).status(),
    ).toBe(404)
    await mutation(owner, `/v1/organizations/${organization.id}/select`)

    expect((await owner.get(`${api}/v1/audit-logs`)).ok()).toBeTruthy()
    expect((await member.get(`${api}/v1/audit-logs`)).status()).toBe(403)

    const sessions = (await (
      await owner.get(`${api}/v1/auth/sessions`)
    ).json()) as {
      id: string
    }[]
    expect(sessions.length).toBeGreaterThan(0)
    expect(
      (await mutation(owner, '/v1/auth/sessions/revoke-others')).ok(),
    ).toBeTruthy()

    const forgot = await owner.post(`${api}/v1/auth/forgot-password`, {
      data: { email: ownerEmail },
    })
    const resetToken = ((await forgot.json()) as { resetToken: string })
      .resetToken
    expect(resetToken).toBeTruthy()
    expect(
      (
        await owner.post(`${api}/v1/auth/reset-password`, {
          data: { token: resetToken, password: 'Nexo-New-Password-2027' },
        })
      ).status(),
    ).toBe(204)

    await owner.dispose()
    await member.dispose()
    await existing.dispose()
  })
})
