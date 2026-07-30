import { Injectable } from '@nestjs/common'
import { readWhatsAppCloudConfig, WhatsAppCloudApiClient } from '@nexo/whatsapp'

export const integrationStatuses = [
  'not_configured',
  'configuration_incomplete',
  'awaiting_authorization',
  'connecting',
  'connected',
  'token_expired',
  'error',
  'provider_review_required',
  'sandbox_only',
  'disabled',
] as const

export type IntegrationStatus = (typeof integrationStatuses)[number]

export interface IntegrationDiagnostic {
  readonly id: string
  readonly name: string
  readonly category:
    | 'channel'
    | 'ai'
    | 'productivity'
    | 'business'
    | 'developer'
  readonly status: IntegrationStatus
  readonly backendImplemented: boolean
  readonly credentialPresent: boolean
  readonly providerReachable: boolean
  readonly webhookHealthy: boolean | null
  readonly detail: string
}

const prototypeOnly = [
  ['slack', 'Slack', 'productivity'],
  ['salesforce', 'Salesforce', 'business'],
  ['hubspot', 'HubSpot', 'business'],
  ['shopify', 'Shopify', 'business'],
  ['stripe', 'Stripe', 'business'],
  ['google-drive', 'Google Drive', 'productivity'],
  ['github', 'GitHub', 'developer'],
  ['custom-api', 'API customizada', 'developer'],
] as const

@Injectable()
export class IntegrationsService {
  async list(): Promise<{
    items: readonly IntegrationDiagnostic[]
    checkedAt: string
  }> {
    const whatsappCredentialPresent = this.#hasAll([
      'META_APP_ID',
      'META_APP_SECRET',
      'META_WHATSAPP_ACCESS_TOKEN',
      'META_WHATSAPP_PHONE_NUMBER_ID',
      'META_WHATSAPP_BUSINESS_ACCOUNT_ID',
      'META_WHATSAPP_ORGANIZATION_ID',
      'META_GRAPH_API_VERSION',
      'META_WEBHOOK_VERIFY_TOKEN',
    ])
    const whatsappConfig = readWhatsAppCloudConfig()
    const whatsappDiagnostic =
      whatsappCredentialPresent && whatsappConfig
        ? await new WhatsAppCloudApiClient(whatsappConfig).diagnose()
        : null
    const whatsappProviderReachable = Boolean(whatsappDiagnostic?.reachable)
    const whatsappWebhookHealthy = Boolean(
      whatsappDiagnostic?.reachable && whatsappDiagnostic.webhookSubscribed,
    )
    const whatsappStatus: IntegrationStatus = !whatsappCredentialPresent
      ? 'not_configured'
      : whatsappDiagnostic?.reason === 'unauthorized'
        ? 'token_expired'
        : whatsappProviderReachable && whatsappWebhookHealthy
          ? 'connected'
          : whatsappDiagnostic?.reason === 'rate_limited'
            ? 'error'
            : 'configuration_incomplete'
    const instagramCredentialPresent = this.#hasAll([
      'META_INSTAGRAM_APP_ID',
      'META_INSTAGRAM_APP_SECRET',
      'META_INSTAGRAM_ACCESS_TOKEN',
      'META_INSTAGRAM_ACCOUNT_ID',
      'META_WEBHOOK_VERIFY_TOKEN',
    ])
    const items: IntegrationDiagnostic[] = [
      {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        category: 'channel',
        status: whatsappStatus,
        backendImplemented: true,
        credentialPresent: whatsappCredentialPresent,
        providerReachable: whatsappProviderReachable,
        webhookHealthy: whatsappWebhookHealthy,
        detail: whatsappProviderReachable
          ? whatsappWebhookHealthy
            ? 'Conta, número e assinatura do webhook validados diretamente na Meta.'
            : 'Conta e número validados, mas o aplicativo ainda não está inscrito no webhook da WABA.'
          : whatsappCredentialPresent
            ? whatsappDiagnostic?.reason === 'unauthorized'
              ? 'O token foi recusado ou expirou; gere um token permanente com escopos mínimos.'
              : 'Credenciais detectadas, mas a conta ainda não respondeu ao diagnóstico seguro.'
            : 'O protótipo mostrava Conectado, mas não há credencial completa nem webhook validado.',
      },
      {
        id: 'instagram',
        name: 'Instagram Messaging',
        category: 'channel',
        status: 'disabled',
        backendImplemented: false,
        credentialPresent: instagramCredentialPresent,
        providerReachable: false,
        webhookHealthy: false,
        detail: instagramCredentialPresent
          ? 'Credenciais do aplicativo existem, mas a conexão do Instagram foi adiada e nenhum token de conta foi emitido.'
          : 'Integração adiada por decisão de produto; nenhuma conta ou webhook está conectado.',
      },
      {
        id: 'openai',
        name: 'OpenAI',
        category: 'ai',
        status: 'disabled',
        backendImplemented: false,
        credentialPresent: Boolean(process.env.OPENAI_API_KEY?.trim()),
        providerReachable: false,
        webhookHealthy: null,
        detail:
          'A camada de IA está prevista para a Fase 5 e não é consumida pelo runtime atual.',
      },
      ...prototypeOnly.map(
        ([id, name, category]): IntegrationDiagnostic => ({
          id,
          name,
          category,
          status: 'disabled',
          backendImplemented: false,
          credentialPresent: false,
          providerReachable: false,
          webhookHealthy: null,
          detail:
            'Referência visual do protótipo; integração não aprovada nem implementada.',
        }),
      ),
    ]
    return { items, checkedAt: new Date().toISOString() }
  }

  #hasAll(names: readonly string[]): boolean {
    return names.every((name) => Boolean(process.env[name]?.trim()))
  }
}
