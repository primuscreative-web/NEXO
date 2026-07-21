'use client'

import { Alert, Button, Card, FormField, Input, PasswordInput } from '@nexo/ui'
import { CheckCircle2, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { apiFetch } from '../lib/api'
import { t } from '../lib/i18n'
import { ThemeToggle } from './theme-toggle'

type AuthMode = 'login' | 'register' | 'forgot' | 'reset' | 'verify'

interface OrganizationAccess {
  organization: {
    id: string
  }
}

interface RegisterResult {
  emailVerificationRequired: boolean
}

const titles: Record<AuthMode, string> = {
  login: t('auth.title.login'),
  register: t('auth.title.register'),
  forgot: t('auth.title.forgot'),
  reset: t('auth.title.reset'),
  verify: t('auth.title.verify'),
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const search = useSearchParams()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const data = new FormData(event.currentTarget)
    try {
      if (mode === 'login') {
        await apiFetch('/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: data.get('email'),
            password: data.get('password'),
          }),
        })
        const organizations =
          await apiFetch<OrganizationAccess[]>('/v1/organizations')
        const organizationId = organizations[0]?.organization.id
        if (organizations.length === 1 && organizationId) {
          await apiFetch(`/v1/organizations/${organizationId}/select`, {
            method: 'POST',
          })
        }
        window.location.assign('/dashboard')
      } else if (mode === 'register') {
        const result = await apiFetch<RegisterResult>('/v1/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: data.get('name'),
            email: data.get('email'),
            password: data.get('password'),
          }),
        })
        router.push(
          result.emailVerificationRequired ? '/verify-email' : '/login',
        )
      } else if (mode === 'forgot') {
        await apiFetch('/v1/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: data.get('email') }),
        })
        setMessage(t('auth.recoveryMessage'))
      } else if (mode === 'reset') {
        await apiFetch('/v1/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            token: search.get('token') ?? data.get('token'),
            password: data.get('password'),
          }),
        })
        router.push('/login?reset=1')
      } else {
        await apiFetch('/v1/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({
            token: search.get('token') ?? data.get('token'),
          }),
        })
        router.push('/login?verified=1')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('auth.unexpected'))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="nexo-auth-layout">
      <section className="nexo-auth-brand" aria-labelledby="brand-title">
        <div className="nexo-auth-brand__logo">
          <span>N</span>
          <strong>NEXO</strong>
        </div>
        <div className="nexo-auth-brand__copy">
          <p className="nexo-eyebrow">{t('auth.brandTagline')}</p>
          <h1 id="brand-title">{t('auth.brandTitle')}</h1>
          <p>{t('auth.brandDescription')}</p>
        </div>
        <ul className="nexo-auth-benefits">
          <li>
            <ShieldCheck aria-hidden="true" /> {t('auth.benefitTenancy')}
          </li>
          <li>
            <LockKeyhole aria-hidden="true" /> {t('auth.benefitSessions')}
          </li>
          <li>
            <Sparkles aria-hidden="true" /> {t('auth.benefitFoundation')}
          </li>
        </ul>
      </section>
      <section className="nexo-auth-form-area" aria-labelledby="form-title">
        <div className="nexo-auth-theme">
          <ThemeToggle />
        </div>
        <Card className="nexo-auth-card">
          <div className="nexo-auth-card__header">
            <p className="nexo-eyebrow">{t('auth.secureAccess')}</p>
            <h2 id="form-title">{titles[mode]}</h2>
            <p>{t('auth.credentialsHelp')}</p>
          </div>
          <form
            className="nexo-form-stack"
            onSubmit={submit}
            aria-busy={pending}
          >
            {mode === 'register' && (
              <FormField label={t('auth.name')}>
                {({ controlId }) => (
                  <Input
                    id={controlId}
                    name="name"
                    minLength={2}
                    maxLength={160}
                    required
                    autoComplete="name"
                  />
                )}
              </FormField>
            )}
            {mode !== 'reset' && mode !== 'verify' && (
              <FormField label={t('auth.email')}>
                {({ controlId }) => (
                  <Input
                    id={controlId}
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                )}
              </FormField>
            )}
            {mode === 'reset' && !search.get('token') && (
              <FormField label={t('auth.recoveryToken')}>
                {({ controlId }) => (
                  <Input
                    id={controlId}
                    name="token"
                    required
                    autoComplete="off"
                  />
                )}
              </FormField>
            )}
            {mode === 'verify' && !search.get('token') && (
              <FormField label={t('auth.verificationToken')}>
                {({ controlId }) => (
                  <Input
                    id={controlId}
                    name="token"
                    required
                    autoComplete="off"
                  />
                )}
              </FormField>
            )}
            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <FormField
                label={
                  mode === 'reset' ? t('auth.newPassword') : t('auth.password')
                }
                {...(mode === 'login'
                  ? {}
                  : {
                      description: t('auth.passwordHelp'),
                    })}
              >
                {({ controlId, descriptionId }) => (
                  <PasswordInput
                    id={controlId}
                    aria-describedby={descriptionId}
                    name="password"
                    minLength={12}
                    maxLength={128}
                    required
                    autoComplete={
                      mode === 'login' ? 'current-password' : 'new-password'
                    }
                  />
                )}
              </FormField>
            )}
            {error && (
              <Alert tone="danger" title={t('auth.cannotContinue')}>
                {error}
              </Alert>
            )}
            {message && (
              <Alert tone="success" title={t('auth.requestReceived')}>
                {message}
              </Alert>
            )}
            <Button
              block
              loading={pending}
              loadingLabel={t('auth.processing')}
              type="submit"
            >
              {mode === 'login' ? t('auth.enter') : t('auth.continue')}
            </Button>
          </form>
          <nav className="nexo-auth-links" aria-label={t('auth.alternatives')}>
            {mode === 'login' ? (
              <>
                <Link href="/forgot-password">{t('auth.forgotPassword')}</Link>
                <Link href="/register">{t('auth.createAccount')}</Link>
              </>
            ) : (
              <Link href="/login">{t('auth.backToLogin')}</Link>
            )}
          </nav>
          {mode === 'login' && search.get('reset') && (
            <p className="nexo-auth-success" role="status">
              <CheckCircle2 aria-hidden="true" /> {t('auth.passwordUpdated')}
            </p>
          )}
        </Card>
      </section>
    </main>
  )
}
