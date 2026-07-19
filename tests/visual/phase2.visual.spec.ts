import { expect, test, type Page } from '@playwright/test'
import { installMockSession } from '../ui/mock-session'

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript(
    (value) => localStorage.setItem('nexo-theme', value),
    theme,
  )
}

test('login in light mode', async ({ page }) => {
  await setTheme(page, 'light')
  await page.goto('/login')
  await expect(
    page.getByRole('heading', { name: 'Entrar no NEXO' }),
  ).toBeVisible()
  await expect(page).toHaveScreenshot('login-light.png', { fullPage: true })
})

test('login in dark mode', async ({ page }) => {
  await setTheme(page, 'dark')
  await page.goto('/login')
  await expect(
    page.getByRole('heading', { name: 'Entrar no NEXO' }),
  ).toBeVisible()
  await expect(page).toHaveScreenshot('login-dark.png', { fullPage: true })
})

for (const theme of ['light', 'dark'] as const) {
  test(`authenticated dashboard in ${theme} mode`, async ({ page }) => {
    await setTheme(page, theme)
    await installMockSession(page)
    await page.goto('/dashboard')
    await expect(
      page.getByRole('heading', { name: 'Central de operações' }),
    ).toBeVisible()
    await expect(page).toHaveScreenshot(`dashboard-${theme}.png`, {
      fullPage: true,
    })
  })
}

test('members administration surface', async ({ page }) => {
  await installMockSession(page)
  await page.goto('/settings/members')
  await expect(
    page.getByRole('heading', { name: 'Pessoas e convites' }),
  ).toBeVisible()
  await expect(page).toHaveScreenshot('members.png', { fullPage: true })
})

test('teams and settings surfaces', async ({ page }) => {
  await installMockSession(page)
  await page.goto('/team')
  await expect(page.getByRole('heading', { name: 'Equipes' })).toBeVisible()
  await expect(page).toHaveScreenshot('teams.png', { fullPage: true })
  await page.goto('/settings')
  await expect(
    page.getByRole('heading', { name: 'Configurações' }),
  ).toBeVisible()
  await expect(page).toHaveScreenshot('settings.png', { fullPage: true })
})
