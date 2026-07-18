import { expect, test, type APIRequestContext } from '@playwright/test'

const configured = Boolean(process.env.TEST_DATABASE_URL)
const api = 'http://localhost:3001'

async function csrf(request: APIRequestContext): Promise<string> {
  const state = await request.storageState()
  return state.cookies.find(({ name }) => name === 'nexo_csrf')?.value ?? ''
}

async function mutation(
  request: APIRequestContext,
  path: string,
  data?: object,
) {
  return request.post(`${api}${path}`, {
    ...(data ? { data } : {}),
    headers: { 'x-csrf-token': await csrf(request) },
  })
}

test.describe('Phase 2 authenticated experience', () => {
  test.skip(!configured, 'requires disposable PostgreSQL/Redis from CI')
  test.describe.configure({ mode: 'serial' })

  test('loads the shell, navigates by keyboard, persists theme and logs out', async ({
    page,
    request,
  }) => {
    const suffix = Date.now().toString(36)
    const email = `phase2-${suffix}@example.test`
    const password = 'Nexo-Secure-Password-2026'
    const registration = await request.post(`${api}/v1/auth/register`, {
      data: { email, name: 'Phase 2 E2E', password },
    })
    expect(registration.status()).toBe(201)
    const verification = (await registration.json()) as {
      verificationToken: string
    }
    expect(
      (
        await request.post(`${api}/v1/auth/verify-email`, {
          data: { token: verification.verificationToken },
        })
      ).status(),
    ).toBe(204)

    await page.goto('http://localhost:3000/login')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.getByLabel('Nome da organização').fill(`Workspace ${suffix}`)
    await page.getByRole('button', { name: 'Criar e selecionar' }).click()
    await expect(
      page.getByRole('navigation', { name: 'Navegação principal' }),
    ).toBeVisible()
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('main')).toBeVisible()

    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+K' : 'Control+K',
    )
    await expect(
      page.getByRole('dialog', { name: 'Paleta de comandos' }),
    ).toBeVisible()
    await page.getByRole('option', { name: 'Ir para Equipe' }).click()
    await expect(page).toHaveURL(/\/team/u)
    await expect(page.getByRole('heading', { name: 'Equipes' })).toBeVisible()

    const themeToggle = page.getByTestId('theme-toggle')
    await themeToggle.click()
    if ((await page.locator('html').getAttribute('data-theme')) !== 'dark')
      await themeToggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Abrir menu' }).focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('complementary', { name: 'Navegação principal' }),
    ).toHaveAttribute('data-mobile-open', 'true')
    await page.getByRole('button', { name: 'Fechar menu' }).press('Enter')

    await page.getByRole('button', { name: /Phase 2 E2E/u }).click()
    await page.getByRole('menuitem', { name: 'Sair com segurança' }).click()
    await expect(page).toHaveURL(/\/login/u)
    await expect(
      page.evaluate(() => localStorage.getItem('nexo-theme')),
    ).resolves.toBe('dark')
  })

  test('switches organizations without retaining the previous tenant view', async ({
    page,
    request,
  }) => {
    const suffix = `${Date.now().toString(36)}-switch`
    const email = `phase2-${suffix}@example.test`
    const password = 'Nexo-Secure-Password-2026'
    const registration = await request.post(`${api}/v1/auth/register`, {
      data: { email, name: 'Tenant Switch E2E', password },
    })
    const { verificationToken } = (await registration.json()) as {
      verificationToken: string
    }
    await request.post(`${api}/v1/auth/verify-email`, {
      data: { token: verificationToken },
    })
    await request.post(`${api}/v1/auth/login`, { data: { email, password } })
    const firstResponse = await mutation(request, '/v1/organizations', {
      name: `Alpha ${suffix}`,
      slug: `alpha-${suffix}`,
    })
    const first = (await firstResponse.json()) as { id: string }
    await mutation(request, `/v1/organizations/${first.id}/select`)
    const secondName = `Beta ${suffix}`
    const secondResponse = await mutation(request, '/v1/organizations', {
      name: secondName,
      slug: `beta-${suffix}`,
    })
    const second = (await secondResponse.json()) as { id: string }
    await mutation(request, `/v1/organizations/${first.id}/select`)
    const organizationAccess = (await (
      await request.get(`${api}/v1/organizations`)
    ).json()) as { role: { permissions: string[] } }[]
    expect(organizationAccess[0]?.role.permissions).toContain('team.read')

    await page.goto('http://localhost:3000/dashboard')
    await expect(
      page.getByText(`Alpha ${suffix}`, { exact: true }),
    ).toBeVisible()
    await page.getByRole('combobox', { name: 'Organização ativa' }).click()
    await page.getByRole('option', { name: secondName }).click()
    await expect(
      page.getByText(`Beta ${suffix}`, { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText(`Alpha ${suffix}`, { exact: true }),
    ).toHaveCount(0)
    await expect(page).toHaveURL(/\/dashboard/u)
  })
})
