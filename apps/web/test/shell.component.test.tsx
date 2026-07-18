import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../src/components/app-shell'
import { ThemeProvider } from '../src/components/theme-provider'
import { apiFetch } from '../src/lib/api'

const push = vi.fn()
const replace = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push, replace, refresh }),
}))
vi.mock('../src/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/lib/api')>()
  return { ...original, apiFetch: vi.fn() }
})

const mockedApi = vi.mocked(apiFetch)

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  document.body.removeAttribute('data-scroll-locked')
})

describe('authenticated shell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    document.body.style.pointerEvents = ''
    mockedApi.mockImplementation(async (path: string) => {
      if (path === '/v1/auth/me')
        return {
          id: 'user-1',
          email: 'owner@example.test',
          name: 'Owner NEXO',
          status: 'ACTIVE',
          locale: 'pt-BR',
          timezone: 'America/Sao_Paulo',
          activeOrganizationId: 'org-1',
        }
      if (path === '/v1/organizations')
        return [
          {
            organization: {
              id: 'org-1',
              name: 'Empresa NEXO',
              slug: 'empresa-nexo',
              status: 'ACTIVE',
              locale: 'pt-BR',
              timezone: 'America/Sao_Paulo',
            },
            role: {
              key: 'owner',
              name: 'Owner',
              permissions: [
                'organization.read',
                'membership.read',
                'membership.invite',
                'team.read',
                'team.create',
                'session.read',
                'audit.read',
              ],
            },
          },
        ]
      return undefined
    })
  })

  it('renders landmarks, navigation, topbar and permission-aware items', async () => {
    render(
      <ThemeProvider>
        <AppShell>
          <h1>Conteúdo real</h1>
        </AppShell>
      </ThemeProvider>,
    )
    expect(
      await screen.findByRole('navigation', { name: 'Navegação principal' }),
    ).toBeVisible()
    expect(screen.getByRole('main')).toHaveTextContent('Conteúdo real')
    expect(screen.getByRole('link', { name: /Equipe/u })).toBeVisible()
    expect(screen.getByRole('button', { name: /Busca global/u })).toBeVisible()
  })

  it('opens the command palette by keyboard and restores navigable commands', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <AppShell>
          <h1>Dashboard</h1>
        </AppShell>
      </ThemeProvider>,
    )
    await screen.findByRole('combobox', { name: 'Organização ativa' })
    await user.keyboard('{Control>}k{/Control}')
    expect(
      screen.getByRole('dialog', { name: 'Paleta de comandos' }),
    ).toBeVisible()
    expect(
      screen.getByRole('option', { name: /Ir para Dashboard/u }),
    ).toBeVisible()
  })

  it('opens the mobile sidebar and persists theme preference', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <AppShell>
          <h1>Dashboard</h1>
        </AppShell>
      </ThemeProvider>,
    )
    await screen.findByRole('combobox', { name: 'Organização ativa' })
    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    await waitFor(() =>
      expect(screen.getByRole('complementary')).toHaveAttribute(
        'data-mobile-open',
        'true',
      ),
    )
    await user.click(screen.getByTestId('theme-toggle'))
    expect(window.localStorage.getItem('nexo-theme')).toBe('light')
  })
})
