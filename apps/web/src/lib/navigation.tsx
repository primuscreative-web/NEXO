import type { PermissionKey } from '@nexo/organization'
import {
  BarChart3,
  Bot,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  CircleUserRound,
  ContactRound,
  DatabaseZap,
  FileClock,
  Gauge,
  Inbox,
  KeyRound,
  Network,
  PlugZap,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { t } from './i18n'

export type RouteGroup = 'overview' | 'workspace' | 'organization' | 'settings'
export type FeatureStatus = 'available' | 'planned' | 'internal'

export interface RouteMetadata {
  path: string
  label: string
  description: string
  icon: LucideIcon
  group: RouteGroup
  breadcrumbs: readonly string[]
  permission?: PermissionKey
  featureStatus: FeatureStatus
  plannedPhase?: number
  shortcut?: readonly string[]
  visible: boolean
  mobile: boolean
}

export const routes = [
  route('/dashboard', t('nav.dashboard'), Gauge, 'overview', {
    description: 'Visão real da fundação organizacional do NEXO.',
    shortcut: ['G', 'D'],
  }),
  route('/inbox', t('nav.inbox'), Inbox, 'workspace', {
    description:
      'Conversas, mensagens sintéticas, atribuições e notas internas.',
    permission: 'conversation.read',
  }),
  planned('/crm', t('nav.crm'), ContactRound, 7, 'workspace'),
  planned('/ai', t('nav.ai'), Bot, 5, 'workspace'),
  planned('/workflows', t('nav.workflows'), Workflow, 8, 'workspace'),
  planned('/knowledge', t('nav.knowledge'), DatabaseZap, 5, 'workspace'),
  planned('/analytics', t('nav.analytics'), BarChart3, 9, 'workspace'),
  planned('/integrations', t('nav.integrations'), PlugZap, 4, 'workspace'),
  route('/team', t('nav.team'), UsersRound, 'organization', {
    description: 'Equipes reais da organização ativa.',
    permission: 'team.read',
    shortcut: ['G', 'T'],
  }),
  route('/settings', t('nav.settings'), Settings, 'organization', {
    description: 'Configurações da conta e da organização.',
    permission: 'organization.read',
  }),
  route('/settings/profile', t('nav.profile'), CircleUserRound, 'settings', {
    description: 'Perfil e segurança da conta.',
    visible: false,
  }),
  route(
    '/settings/organization',
    t('nav.organizationSettings'),
    Building2,
    'settings',
    {
      description: 'Dados e preferências da organização ativa.',
      permission: 'organization.read',
      visible: false,
    },
  ),
  route('/settings/members', t('nav.members'), UsersRound, 'settings', {
    description: 'Memberships e convites da organização.',
    permission: 'membership.read',
    visible: false,
  }),
  route('/settings/roles', t('nav.roles'), ShieldCheck, 'settings', {
    description: 'Matriz de papéis e permissões.',
    permission: 'role.read',
    visible: false,
  }),
  route('/settings/sessions', t('nav.sessions'), KeyRound, 'settings', {
    description: 'Sessões ativas e revogação.',
    permission: 'session.read',
    visible: false,
  }),
  route('/settings/audit', t('nav.audit'), ScrollText, 'settings', {
    description: 'Trilha append-only de ações críticas.',
    permission: 'audit.read',
    visible: false,
  }),
  route('/settings/design-system', t('nav.uiLab'), Sparkles, 'settings', {
    description: 'Catálogo visual e técnico dos componentes NEXO.',
    featureStatus: 'internal',
    visible: false,
  }),
] as const satisfies readonly RouteMetadata[]

export const navigationGroups: readonly {
  id: Exclude<RouteGroup, 'settings'>
  label: string
}[] = [
  { id: 'overview', label: t('nav.overview') },
  { id: 'workspace', label: t('nav.workspace') },
  { id: 'organization', label: t('nav.organization') },
]

export function currentRoute(pathname: string): RouteMetadata | undefined {
  return [...routes]
    .sort((left, right) => right.path.length - left.path.length)
    .find(
      (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
    )
}

export function breadcrumbsFor(pathname: string): readonly {
  label: string
  href?: string
}[] {
  const current = currentRoute(pathname)
  if (!current) return [{ label: t('app.name') }]
  return [
    { label: t('app.name'), href: '/dashboard' },
    ...current.breadcrumbs.map((label, index) => ({
      label,
      ...(index < current.breadcrumbs.length - 1
        ? {
            href: current.path
              .split('/')
              .slice(0, index + 2)
              .join('/'),
          }
        : {}),
    })),
  ]
}

export function routeAllowed(
  routeMetadata: RouteMetadata,
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  return (
    routeMetadata.permission === undefined ||
    permissions.has(routeMetadata.permission)
  )
}

function route(
  path: string,
  label: string,
  icon: LucideIcon,
  group: RouteGroup,
  options: Partial<Omit<RouteMetadata, 'path' | 'label' | 'icon' | 'group'>>,
): RouteMetadata {
  return {
    path,
    label,
    icon,
    group,
    breadcrumbs: [label],
    description: options.description ?? label,
    featureStatus: options.featureStatus ?? 'available',
    visible: options.visible ?? true,
    mobile: options.mobile ?? true,
    ...(options.permission ? { permission: options.permission } : {}),
    ...(options.plannedPhase ? { plannedPhase: options.plannedPhase } : {}),
    ...(options.shortcut ? { shortcut: options.shortcut } : {}),
  }
}

function planned(
  path: string,
  label: string,
  icon: LucideIcon,
  phase: number,
  group: RouteGroup,
): RouteMetadata {
  return route(path, label, icon, group, {
    description: t('future.description', { phase }),
    featureStatus: 'planned',
    plannedPhase: phase,
  })
}

export const structuralSearchProviders = [
  { id: 'routes', label: 'Rotas', icon: Network },
  { id: 'members', label: 'Pessoas', icon: UsersRound },
  { id: 'teams', label: 'Equipes', icon: Boxes },
  { id: 'audit', label: 'Auditoria', icon: FileClock },
  { id: 'analytics', label: 'Analytics futuro', icon: ChartNoAxesCombined },
] as const
