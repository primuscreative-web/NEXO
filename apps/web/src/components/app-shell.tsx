'use client'

import {
  Badge,
  Breadcrumb,
  Button,
  CommandPalette,
  IconButton,
  KeyboardShortcut,
  LoadingPage,
  OrganizationSwitcher,
  PermissionState,
  StatusIndicator,
  ToastRegion,
  Tooltip,
  UserMenu,
  type CommandItem,
} from '@nexo/ui'
import {
  Bell,
  CircleHelp,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { t } from '../lib/i18n'
import {
  breadcrumbsFor,
  currentRoute,
  navigationGroups,
  routeAllowed,
  routes,
} from '../lib/navigation'
import { ThemeToggle } from './theme-toggle'
import { useTheme } from './theme-provider'
import { SessionProvider, useSession } from './session-context'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AppShellContent>{children}</AppShellContent>
    </SessionProvider>
  )
}

function AppShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const session = useSession()
  const { setPreference } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const metadata = currentRoute(pathname)

  useEffect(() => {
    const stored = window.localStorage.getItem('nexo-sidebar-collapsed')
    setCollapsed(stored === 'true')
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  const commands = useMemo<readonly CommandItem[]>(() => {
    const navigation: CommandItem[] = routes
      .filter(
        (route) =>
          route.featureStatus !== 'internal' &&
          routeAllowed(route, session.permissions),
      )
      .map((route) => ({
        id: `navigate-${route.path}`,
        label: `Ir para ${route.label}`,
        group: t('command.navigation'),
        keywords: [route.description],
        ...(route.shortcut ? { shortcut: route.shortcut } : {}),
        icon: <route.icon />,
        onSelect: () => router.push(route.path),
      }))
    const organizations: CommandItem[] = session.organizations.map(
      ({ organization }) => ({
        id: `organization-${organization.id}`,
        label: `${t('organization.switch')}: ${organization.name}`,
        group: t('command.organization'),
        icon: <UsersRound />,
        onSelect: () => void session.selectOrganization(organization.id),
      }),
    )
    const actions: CommandItem[] = [
      {
        id: 'theme-light',
        label: `${t('theme.label')}: ${t('theme.light')}`,
        group: t('command.appearance'),
        onSelect: () => setPreference('light'),
      },
      {
        id: 'theme-dark',
        label: `${t('theme.label')}: ${t('theme.dark')}`,
        group: t('command.appearance'),
        onSelect: () => setPreference('dark'),
      },
      {
        id: 'theme-system',
        label: `${t('theme.label')}: ${t('theme.system')}`,
        group: t('command.appearance'),
        onSelect: () => setPreference('system'),
      },
      {
        id: 'create-team',
        label: 'Criar equipe',
        group: t('command.organization'),
        disabled: !session.permissions.has('team.create'),
        icon: <UsersRound />,
        onSelect: () => router.push('/team?create=1'),
      },
      {
        id: 'invite-member',
        label: 'Convidar membro',
        group: t('command.organization'),
        disabled: !session.permissions.has('membership.invite'),
        icon: <UserPlus />,
        onSelect: () => router.push('/settings/members?invite=1'),
      },
      {
        id: 'logout',
        label: t('command.logout'),
        group: t('command.account'),
        icon: <LogOut />,
        onSelect: () => void session.logout(),
      },
    ]
    return [...navigation, ...organizations, ...actions]
  }, [router, session, setPreference])

  if (session.loading) {
    return (
      <div className="nexo-shell-loading">
        <LoadingPage label="Carregando workspace" />
      </div>
    )
  }

  if (session.error) {
    return (
      <main className="nexo-system-page">
        <PermissionState
          title="Não foi possível abrir seu workspace"
          description={session.error}
          action={
            <Button onClick={() => void session.reload()}>
              {t('common.retry')}
            </Button>
          }
        />
      </main>
    )
  }

  const isAllowed = metadata
    ? routeAllowed(metadata, session.permissions)
    : true
  return (
    <div
      className="nexo-app-shell"
      data-sidebar-collapsed={collapsed || undefined}
    >
      <a className="nexo-skip-link" href="#main-content">
        {t('shell.skipToContent')}
      </a>
      {mobileOpen && (
        <button
          aria-label="Fechar menu"
          className="nexo-mobile-overlay"
          type="button"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        pathname={pathname}
        onCollapse={() => {
          const next = !collapsed
          setCollapsed(next)
          window.localStorage.setItem('nexo-sidebar-collapsed', String(next))
        }}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="nexo-workspace">
        <header className="nexo-topbar">
          <div className="nexo-topbar__leading">
            <IconButton
              className="nexo-mobile-menu-button"
              icon={<Menu />}
              label={t('shell.openMenu')}
              variant="ghost"
              onClick={() => setMobileOpen(true)}
            />
            <div className="nexo-topbar__title">
              <Breadcrumb items={breadcrumbsFor(pathname)} />
              <strong>{metadata?.label ?? t('app.name')}</strong>
            </div>
          </div>
          <div className="nexo-topbar__actions">
            <button
              className="nexo-global-search"
              type="button"
              onClick={() => setCommandOpen(true)}
            >
              <Search aria-hidden="true" />
              <span>{t('shell.globalSearch')}</span>
              <KeyboardShortcut keys={['Ctrl', 'K']} />
            </button>
            <Tooltip content={t('shell.noNotifications')}>
              <IconButton
                disabled
                icon={<Bell />}
                label={t('shell.notifications')}
                variant="ghost"
              />
            </Tooltip>
            <ThemeToggle />
            <Tooltip content={t('shell.help')}>
              <IconButton
                icon={<CircleHelp />}
                label={t('shell.help')}
                variant="ghost"
              />
            </Tooltip>
            {session.user && (
              <UserMenu
                email={session.user.email}
                name={session.user.name}
                items={[
                  {
                    id: 'profile',
                    label: t('nav.profile'),
                    onSelect: () => router.push('/settings/profile'),
                  },
                  {
                    id: 'logout',
                    label: t('command.logout'),
                    destructive: true,
                    onSelect: () => void session.logout(),
                  },
                ]}
              />
            )}
          </div>
        </header>
        <main className="nexo-main" id="main-content" tabIndex={-1}>
          {isAllowed ? (
            children
          ) : (
            <PermissionState
              title={t('state.accessDenied')}
              description={t('state.accessDeniedDescription')}
              action={
                <Button
                  variant="secondary"
                  onClick={() => router.push('/dashboard')}
                >
                  Voltar ao Dashboard
                </Button>
              }
            />
          )}
        </main>
      </div>
      <Tooltip content={t('shell.copilotPlanned')}>
        <button className="nexo-copilot-placeholder" type="button" disabled>
          <Sparkles aria-hidden="true" />
          <span>Copilot</span>
        </button>
      </Tooltip>
      <CommandPalette
        items={commands}
        open={commandOpen}
        placeholder={t('command.placeholder')}
        onOpenChange={setCommandOpen}
      />
      <ToastRegion />
    </div>
  )
}

function Sidebar({
  collapsed,
  mobileOpen,
  onCollapse,
  onMobileClose,
  pathname,
}: {
  collapsed: boolean
  mobileOpen: boolean
  onCollapse: () => void
  onMobileClose: () => void
  pathname: string
}) {
  const session = useSession()
  return (
    <aside
      className="nexo-sidebar"
      data-mobile-open={mobileOpen || undefined}
      aria-label={t('nav.main')}
    >
      <div className="nexo-sidebar__brand">
        <Link
          className="nexo-brand"
          href="/dashboard"
          aria-label="NEXO — Dashboard"
        >
          <span className="nexo-brand__mark">N</span>
          <span className="nexo-brand__word">NEXO</span>
        </Link>
        <IconButton
          className="nexo-sidebar__mobile-close"
          icon={<X />}
          label="Fechar menu"
          variant="ghost"
          onClick={onMobileClose}
        />
      </div>
      <div className="nexo-sidebar__organization">
        <OrganizationSwitcher
          organizations={session.organizations.map(
            ({ organization, role }) => ({
              id: organization.id,
              name: organization.name,
              role: role.name,
            }),
          )}
          onChange={(id) => void session.selectOrganization(id)}
          {...(session.activeOrganization
            ? { value: session.activeOrganization.organization.id }
            : {})}
        />
      </div>
      <nav className="nexo-sidebar__nav" aria-label={t('nav.main')}>
        {navigationGroups.map((group) => (
          <section key={group.id} aria-labelledby={`nav-${group.id}`}>
            <h2 id={`nav-${group.id}`}>{group.label}</h2>
            <div>
              {routes
                .filter((route) => route.visible && route.group === group.id)
                .map((route) => {
                  const active =
                    pathname === route.path ||
                    pathname.startsWith(`${route.path}/`)
                  const allowed = routeAllowed(route, session.permissions)
                  const item = (
                    <Link
                      aria-current={active ? 'page' : undefined}
                      aria-disabled={!allowed || undefined}
                      className={`nexo-nav-item${active ? ' nexo-nav-item--active' : ''}`}
                      href={allowed ? route.path : '/access-denied'}
                      key={route.path}
                    >
                      <span className="nexo-nav-item__icon" aria-hidden="true">
                        <route.icon />
                      </span>
                      <span className="nexo-nav-item__label">
                        {route.label}
                      </span>
                      {route.plannedPhase && (
                        <Badge className="nexo-nav-item__badge" tone="ai">
                          F{route.plannedPhase}
                        </Badge>
                      )}
                    </Link>
                  )
                  return collapsed ? (
                    <Tooltip content={route.label} key={route.path}>
                      {item}
                    </Tooltip>
                  ) : (
                    item
                  )
                })}
            </div>
          </section>
        ))}
        <section
          className="nexo-sidebar__structural"
          aria-labelledby="nav-favorites"
        >
          <h2 id="nav-favorites">{t('shell.favorites')}</h2>
          <p>{t('shell.noFavorites')}</p>
        </section>
      </nav>
      <div className="nexo-sidebar__footer">
        <StatusIndicator label="Serviços operacionais" status="online" />
        <Button
          block
          leadingIcon={collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          variant="ghost"
          onClick={onCollapse}
        >
          {collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
        </Button>
      </div>
    </aside>
  )
}
