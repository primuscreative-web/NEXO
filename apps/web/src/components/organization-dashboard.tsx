'use client'

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
} from '@nexo/ui'
import { Building2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { apiFetch } from '../lib/api'
import { t } from '../lib/i18n'
import { tenantQueryCache } from '../lib/tenant-cache'
import { useSession } from './session-context'

export function OrganizationDashboard() {
  const session = useSession()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const form = event.currentTarget
    const data = new FormData(form)
    const slugEntry = data.get('slug')
    const slug = typeof slugEntry === 'string' ? slugEntry.trim() : ''
    try {
      const organization = await apiFetch<{ id: string }>('/v1/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: data.get('name'),
          ...(slug ? { slug } : {}),
        }),
      })
      tenantQueryCache.clearAll()
      await session.selectOrganization(organization.id)
      form.reset()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t('onboarding.createError'),
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="nexo-page" aria-labelledby="onboarding-title">
      <header className="nexo-page-header nexo-page-header--hero">
        <div>
          <p className="nexo-eyebrow">{t('onboarding.eyebrow')}</p>
          <h1 id="onboarding-title">{t('onboarding.title')}</h1>
          <p>{t('onboarding.description')}</p>
        </div>
      </header>
      {error && (
        <Alert tone="danger" title={t('auth.cannotContinue')}>
          {error}
        </Alert>
      )}
      {session.organizations.length > 0 ? (
        <div className="nexo-card-grid">
          {session.organizations.map(({ organization, role }) => (
            <Card key={organization.id}>
              <div className="nexo-card-heading">
                <Building2 aria-hidden="true" />
                <Badge tone="success">{organization.status}</Badge>
              </div>
              <h2>{organization.name}</h2>
              <p>
                {organization.slug} · {role.name}
              </p>
              <Button
                variant="secondary"
                onClick={() => void session.selectOrganization(organization.id)}
              >
                {t('onboarding.select')}
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title={t('onboarding.emptyTitle')}
          description={t('onboarding.emptyDescription')}
        />
      )}
      <Card className="nexo-form-card">
        <div>
          <p className="nexo-eyebrow">{t('onboarding.newOrganization')}</p>
          <h2>{t('onboarding.createWorkspace')}</h2>
          <p>{t('onboarding.ownerNotice')}</p>
        </div>
        <form className="nexo-form-stack" onSubmit={create} aria-busy={pending}>
          <FormField label={t('onboarding.organizationName')}>
            {({ controlId }) => (
              <Input
                id={controlId}
                name="name"
                required
                minLength={2}
                maxLength={160}
              />
            )}
          </FormField>
          <FormField
            label="Slug"
            optional
            description={t('onboarding.slugHelp')}
          >
            {({ controlId, descriptionId }) => (
              <Input
                id={controlId}
                name="slug"
                minLength={3}
                maxLength={80}
                aria-describedby={descriptionId}
              />
            )}
          </FormField>
          <Button loading={pending} type="submit">
            {t('onboarding.createAndSelect')}
          </Button>
        </form>
      </Card>
    </section>
  )
}
