'use client'

import { Badge, Button, Card, EmptyState, Skeleton, StatCard } from '@nexo/ui'
import { KeyRound, ScrollText, ShieldCheck, UsersRound } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { t } from '../lib/i18n'
import { tenantQueryCache } from '../lib/tenant-cache'
import { OrganizationDashboard } from './organization-dashboard'
import { useSession } from './session-context'

interface PageResult {
  items: unknown[]
}

interface DashboardCounts {
  memberships?: number
  teams?: number
  sessions?: number
  audit?: number
}

export function Dashboard() {
  const session = useSession()
  const [counts, setCounts] = useState<DashboardCounts | null>(null)
  const [error, setError] = useState<string | null>(null)
  const organization = session.activeOrganization?.organization

  useEffect(() => {
    if (!organization) return
    const requests: Promise<[keyof DashboardCounts, number]>[] = []
    const read = (key: keyof DashboardCounts, path: string) =>
      tenantQueryCache
        .getOrCreate({ kind: 'organization', id: organization.id }, path, () =>
          apiFetch<PageResult>(path),
        )
        .then((page): [keyof DashboardCounts, number] => [
          key,
          page.items.length,
        ])
    if (session.permissions.has('membership.read'))
      requests.push(
        read(
          'memberships',
          `/v1/organizations/${organization.id}/memberships?limit=100`,
        ),
      )
    if (session.permissions.has('team.read'))
      requests.push(read('teams', '/v1/teams?limit=100'))
    if (session.permissions.has('session.read'))
      requests.push(
        tenantQueryCache
          .getOrCreate({ kind: 'global' }, '/v1/auth/sessions', () =>
            apiFetch<PageResult>('/v1/auth/sessions?limit=100'),
          )
          .then((page): [keyof DashboardCounts, number] => [
            'sessions',
            page.items.length,
          ]),
      )
    if (session.permissions.has('audit.read'))
      requests.push(read('audit', '/v1/audit-logs?limit=20'))
    void Promise.all(requests)
      .then((entries) =>
        setCounts(Object.fromEntries(entries) as DashboardCounts),
      )
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : t('dashboard.loadError'),
        ),
      )
  }, [organization, session.permissions])

  if (!organization) return <OrganizationDashboard />
  return (
    <section className="nexo-page" aria-labelledby="dashboard-title">
      <header className="nexo-page-header nexo-page-header--hero">
        <div>
          <p className="nexo-eyebrow">{t('dashboard.eyebrow')}</p>
          <h1 id="dashboard-title">{t('dashboard.title')}</h1>
          <p>{t('dashboard.description')}</p>
        </div>
        <div className="nexo-page-header__meta">
          <Badge tone="success">{organization.status}</Badge>
          <span>{organization.name}</span>
          <small>{session.activeOrganization?.role.name}</small>
        </div>
      </header>
      <Card className="nexo-dashboard-notice">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>{t('dashboard.realDataNotice')}</strong>
          <p>{t('dashboard.tenantNotice')}</p>
        </div>
      </Card>
      {error && (
        <p className="nexo-inline-error" role="alert">
          {error}
        </p>
      )}
      {!counts && !error ? (
        <div
          className="nexo-stat-grid"
          aria-label={t('dashboard.loadingIndicators')}
        >
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : (
        <div className="nexo-stat-grid">
          {counts?.memberships !== undefined && (
            <StatCard
              label={t('dashboard.memberships')}
              value={counts.memberships}
              icon={<UsersRound />}
            />
          )}
          {counts?.teams !== undefined && (
            <StatCard
              label={t('dashboard.teams')}
              value={counts.teams}
              icon={<UsersRound />}
            />
          )}
          {counts?.sessions !== undefined && (
            <StatCard
              label={t('dashboard.sessions')}
              value={counts.sessions}
              icon={<KeyRound />}
            />
          )}
          {counts?.audit !== undefined && (
            <StatCard
              label={t('dashboard.audit')}
              value={counts.audit}
              icon={<ScrollText />}
            />
          )}
        </div>
      )}
      <section
        className="nexo-dashboard-grid"
        aria-labelledby="quick-actions-title"
      >
        <Card>
          <h2 id="quick-actions-title">{t('dashboard.quickActions')}</h2>
          <p>{t('dashboard.quickActionsDescription')}</p>
          <div className="nexo-action-list">
            {session.permissions.has('membership.invite') && (
              <Button
                variant="secondary"
                onClick={() =>
                  window.location.assign('/settings/members?invite=1')
                }
              >
                {t('dashboard.inviteMember')}
              </Button>
            )}
            {session.permissions.has('team.create') && (
              <Button
                variant="secondary"
                onClick={() => window.location.assign('/team?create=1')}
              >
                {t('dashboard.createTeam')}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => window.location.assign('/settings/profile')}
            >
              {t('dashboard.reviewProfile')}
            </Button>
          </div>
        </Card>
        <EmptyState
          title={t('dashboard.futureTitle')}
          description={t('dashboard.futureDescription')}
          action={
            <Link href="/inbox">{t('dashboard.openInboxStructure')}</Link>
          }
        />
      </section>
    </section>
  )
}
