import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { installMockSession } from '../ui/mock-session'

async function expectNoSeriousViolations(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(
    result.violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical',
    ),
  ).toEqual([])
}

test('login has no serious WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto('/login')
  await expect(
    page.getByRole('heading', { name: 'Entrar no NEXO' }),
  ).toBeVisible()
  await expectNoSeriousViolations(page)
})

test('authenticated shell and dashboard pass the accessibility gate', async ({
  page,
}) => {
  await installMockSession(page)
  await page.goto('/dashboard')
  await expect(
    page.getByRole('heading', { name: 'Central de operações' }),
  ).toBeVisible()
  await expectNoSeriousViolations(page)
})

test('component catalog passes the accessibility gate', async ({ page }) => {
  await installMockSession(page)
  await page.goto('/settings/design-system')
  await expect(
    page.getByRole('heading', { name: 'Design System NEXO' }),
  ).toBeVisible()
  await expectNoSeriousViolations(page)
})
