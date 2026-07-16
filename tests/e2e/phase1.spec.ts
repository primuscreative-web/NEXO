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
    const analystRole = roles.find((role) => role.key === 'analyst')!

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
    const memberships = (
      (await membershipsResponse.json()) as {
        items: { id: string; user: { email: string } }[]
      }
    ).items
    const memberMembership = memberships.find(
      (membership) => membership.user.email === memberEmail,
    )!
    expect(
      (
        await mutation(owner, `/v1/memberships/${memberMembership.id}`, {
          method: 'patch',
          data: { roleId: analystRole.id },
        })
      ).ok(),
    ).toBeTruthy()
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
    const secondTeam = (await (
      await mutation(owner, '/v1/teams', {
        data: { name: `Equipe isolada ${suffix}` },
      })
    ).json()) as { id: string }
    expect(
      (
        await mutation(owner, `/v1/teams/${secondTeam.id}/members`, {
          data: { membershipId: memberMembership.id },
        })
      ).status(),
    ).toBe(422)
    expect(
      (await owner.get(`${api}/v1/organizations/${organization.id}`)).status(),
    ).toBe(404)
    await mutation(owner, `/v1/organizations/${organization.id}/select`)

    expect(
      (
        await mutation(owner, `/v1/memberships/${memberMembership.id}`, {
          method: 'patch',
          data: { status: 'SUSPENDED' },
        })
      ).ok(),
    ).toBeTruthy()
    const reinvite = (await (
      await mutation(
        owner,
        `/v1/organizations/${organization.id}/invitations`,
        { data: { email: memberEmail, roleId: agentRole.id } },
      )
    ).json()) as { token: string }
    expect(
      (
        await mutation(member, `/v1/invitations/${reinvite.token}/accept`)
      ).status(),
    ).toBe(409)

    expect((await owner.get(`${api}/v1/audit-logs`)).ok()).toBeTruthy()
    expect((await member.get(`${api}/v1/audit-logs`)).status()).toBe(403)

    const sessions = (
      (await (await owner.get(`${api}/v1/auth/sessions`)).json()) as {
        items: { id: string }[]
      }
    ).items
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

  test('enforces cookie, origin, logout and refresh-family controls', async ({
    playwright,
  }) => {
    const browserSession = await playwright.request.newContext()
    const email = `security-${suffix}@example.test`
    const password = 'Nexo-Secure-Password-2026'
    await registerAndVerify(browserSession, {
      email,
      name: 'Security E2E',
      password,
    })
    const login = await browserSession.post(`${api}/v1/auth/login`, {
      data: { email, password },
    })
    expect(login.ok()).toBeTruthy()
    const cookieState = await browserSession.storageState()
    expect(
      cookieState.cookies.find(({ name }) => name === 'nexo_access'),
    ).toMatchObject({
      httpOnly: true,
      sameSite: 'Lax',
    })
    expect(
      cookieState.cookies.find(({ name }) => name === 'nexo_refresh'),
    ).toMatchObject({
      httpOnly: true,
      sameSite: 'Lax',
    })
    expect(
      cookieState.cookies.find(({ name }) => name === 'nexo_csrf')?.httpOnly,
    ).toBe(false)

    expect((await mutation(browserSession, '/v1/auth/logout')).status()).toBe(
      204,
    )
    expect((await browserSession.get(`${api}/v1/auth/me`)).status()).toBe(401)
    expect(
      (await browserSession.storageState()).cookies.filter(({ name }) =>
        name.startsWith('nexo_'),
      ),
    ).toEqual([])

    expect(
      (
        await browserSession.post(`${api}/v1/auth/login`, {
          data: { email, password },
        })
      ).ok(),
    ).toBeTruthy()
    const originalState = await browserSession.storageState()
    expect(
      (await mutation(browserSession, '/v1/auth/refresh')).ok(),
    ).toBeTruthy()
    const replay = await playwright.request.newContext({
      storageState: originalState,
    })
    expect((await mutation(replay, '/v1/auth/refresh')).status()).toBe(401)
    expect((await browserSession.get(`${api}/v1/auth/me`)).status()).toBe(401)

    expect(
      (
        await browserSession.post(`${api}/v1/auth/forgot-password`, {
          headers: { origin: 'https://attacker.example' },
          data: { email },
        })
      ).status(),
    ).toBe(403)
    await replay.dispose()
    await browserSession.dispose()
  })

  test('runs registration-backed onboarding through the real web interface', async ({
    page,
    request,
  }) => {
    const email = `frontend-${suffix}@example.test`
    const password = 'Nexo-Secure-Password-2026'
    await registerAndVerify(request, { email, name: 'Frontend E2E', password })
    await page.goto('http://localhost:3000/login')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(
      page.getByRole('heading', { name: 'Suas organizações' }),
    ).toBeVisible()
    const organizationName = `Organização visual ${suffix}`
    await page.getByLabel('Nome').fill(organizationName)
    await page.getByRole('button', { name: 'Criar e selecionar' }).click()
    await expect(page).toHaveURL(/\/app/u)
    await expect(
      page.getByRole('heading', { name: organizationName }),
    ).toBeVisible()
    await expect(page.locator('.alert.error')).toHaveCount(0)
    await page.getByRole('link', { name: 'Pessoas e convites' }).click()
    await expect(
      page.getByRole('heading', { name: 'Pessoas e convites' }),
    ).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()
  })
})
