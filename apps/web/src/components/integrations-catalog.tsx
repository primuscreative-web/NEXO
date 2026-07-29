'use client'

import { Badge, Card, Skeleton } from '@nexo/ui'
import { PlugZap, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

type IntegrationStatus =
  | 'not_configured'
  | 'configuration_incomplete'
  | 'awaiting_authorization'
  | 'connecting'
  | 'connected'
  | 'token_expired'
  | 'error'
  | 'provider_review_required'
  | 'sandbox_only'
  | 'disabled'

interface IntegrationDiagnostic {
  id: string
  name: string
  category: string
  status: IntegrationStatus
  backendImplemented: boolean
  credentialPresent: boolean
  providerReachable: boolean
  webhookHealthy: boolean | null
  detail: string
}

interface IntegrationResponse {
  items: IntegrationDiagnostic[]
  checkedAt: string
}

const statusPresentation: Record<
  IntegrationStatus,
  { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  not_configured: { label: 'Não configurado', tone: 'neutral' },
  configuration_incomplete: {
    label: 'Configuração incompleta',
    tone: 'warning',
  },
  awaiting_authorization: {
    label: 'Aguardando autorização',
    tone: 'warning',
  },
  connecting: { label: 'Conectando', tone: 'info' },
  connected: { label: 'Conectado', tone: 'success' },
  token_expired: { label: 'Token expirado', tone: 'danger' },
  error: { label: 'Erro', tone: 'danger' },
  provider_review_required: {
    label: 'Requer revisão do provedor',
    tone: 'warning',
  },
  sandbox_only: { label: 'Disponível apenas em sandbox', tone: 'info' },
  disabled: { label: 'Desativado', tone: 'neutral' },
}

export function IntegrationsCatalog() {
  const [result, setResult] = useState<IntegrationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void apiFetch<IntegrationResponse>('/v1/integrations')
      .then(setResult)
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível verificar as integrações.',
        ),
      )
  }, [])

  return (
    <section className="nexo-page" aria-labelledby="integrations-title">
      <header className="nexo-page-header nexo-page-header--hero">
        <div>
          <p className="nexo-eyebrow">Estado confirmado pelo backend</p>
          <h1 id="integrations-title">Integrações</h1>
          <p>
            Um serviço só aparece conectado após credencial, acesso ao provedor
            e configuração mínima serem validados.
          </p>
        </div>
        <ShieldCheck aria-hidden="true" />
      </header>
      {error && (
        <p className="nexo-inline-error" role="alert">
          {error}
        </p>
      )}
      {!result && !error ? (
        <div className="nexo-card-grid" aria-label="Verificando integrações">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : (
        <div className="nexo-card-grid">
          {result?.items.map((integration) => {
            const presentation = statusPresentation[integration.status]
            return (
              <Card className="nexo-integration-card" key={integration.id}>
                <div className="nexo-integration-card__header">
                  <PlugZap aria-hidden="true" />
                  <Badge tone={presentation.tone}>{presentation.label}</Badge>
                </div>
                <h2>{integration.name}</h2>
                <p>{integration.detail}</p>
                <dl className="nexo-integration-evidence">
                  <div>
                    <dt>Backend</dt>
                    <dd>{integration.backendImplemented ? 'Sim' : 'Não'}</dd>
                  </div>
                  <div>
                    <dt>Credencial</dt>
                    <dd>
                      {integration.credentialPresent ? 'Detectada' : 'Ausente'}
                    </dd>
                  </div>
                  <div>
                    <dt>Provedor</dt>
                    <dd>
                      {integration.providerReachable
                        ? 'Validado'
                        : 'Não validado'}
                    </dd>
                  </div>
                  {integration.webhookHealthy !== null && (
                    <div>
                      <dt>Webhook</dt>
                      <dd>
                        {integration.webhookHealthy ? 'Saudável' : 'Pendente'}
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>
            )
          })}
        </div>
      )}
      {result && (
        <p className="nexo-integration-checked-at">
          Diagnóstico atualizado em{' '}
          {new Date(result.checkedAt).toLocaleString('pt-BR')}.
        </p>
      )}
    </section>
  )
}
