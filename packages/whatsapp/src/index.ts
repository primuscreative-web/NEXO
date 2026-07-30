export interface WhatsAppCloudConfig {
  readonly appId: string
  readonly accessToken: string
  readonly phoneNumberId: string
  readonly businessAccountId: string
  readonly graphApiVersion: string
}

export interface WhatsAppCloudDiagnostic {
  readonly reachable: boolean
  readonly phoneNumberId?: string
  readonly displayPhoneNumber?: string
  readonly verifiedName?: string
  readonly qualityRating?: string
  readonly businessAccountId?: string
  readonly businessAccountName?: string
  readonly webhookSubscribed?: boolean
  readonly reason?:
    | 'not_configured'
    | 'unauthorized'
    | 'not_found'
    | 'rate_limited'
    | 'provider_error'
    | 'timeout'
}

export interface NormalizedWhatsAppInbound {
  readonly kind: 'message'
  readonly phoneNumberId: string
  readonly externalId: string
  readonly from: string
  readonly contactName?: string
  readonly type: string
  readonly body?: string
  readonly mediaId?: string
  readonly mimeType?: string
  readonly occurredAt: Date
}

export interface NormalizedWhatsAppStatus {
  readonly kind: 'status'
  readonly phoneNumberId: string
  readonly externalId: string
  readonly status: 'sent' | 'delivered' | 'read' | 'failed'
  readonly occurredAt: Date
  readonly errorCode?: number
}

export type NormalizedWhatsAppEvent =
  | NormalizedWhatsAppInbound
  | NormalizedWhatsAppStatus

type FetchLike = typeof fetch

interface GraphErrorBody {
  readonly error?: {
    readonly code?: number
    readonly message?: string
  }
}

export class WhatsAppCloudApiClient {
  constructor(
    private readonly config: WhatsAppCloudConfig,
    private readonly fetcher: FetchLike = fetch,
    private readonly timeoutMs = 10_000,
  ) {
    if (!/^v\d+\.\d+$/u.test(config.graphApiVersion))
      throw new Error('META_GRAPH_API_VERSION_INVALID')
  }

  async diagnose(): Promise<WhatsAppCloudDiagnostic> {
    try {
      const [phone, business, subscriptions] = await Promise.all([
        this.get<{
          id?: string
          display_phone_number?: string
          verified_name?: string
          quality_rating?: string
        }>(
          `${this.config.phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`,
        ),
        this.get<{ id?: string; name?: string }>(
          `${this.config.businessAccountId}?fields=id,name`,
        ),
        this.get<{ data?: { id?: string }[] }>(
          `${this.config.businessAccountId}/subscribed_apps`,
        ),
      ])
      if (
        phone.id !== this.config.phoneNumberId ||
        business.id !== this.config.businessAccountId
      )
        return { reachable: false, reason: 'not_found' }
      return {
        reachable: true,
        phoneNumberId: phone.id,
        ...(phone.display_phone_number
          ? { displayPhoneNumber: phone.display_phone_number }
          : {}),
        ...(phone.verified_name ? { verifiedName: phone.verified_name } : {}),
        ...(phone.quality_rating
          ? { qualityRating: phone.quality_rating }
          : {}),
        businessAccountId: business.id,
        ...(business.name ? { businessAccountName: business.name } : {}),
        webhookSubscribed: Boolean(
          subscriptions.data?.some(({ id }) => id === this.config.appId),
        ),
      }
    } catch (error) {
      return {
        reachable: false,
        reason:
          error instanceof WhatsAppCloudError
            ? error.reason
            : error instanceof DOMException && error.name === 'TimeoutError'
              ? 'timeout'
              : 'provider_error',
      }
    }
  }

  async sendText(input: {
    readonly to: string
    readonly body: string
  }): Promise<{ id: string }> {
    const payload = await this.request<{ messages?: { id?: string }[] }>(
      `${this.config.phoneNumberId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: input.to,
          type: 'text',
          text: { preview_url: false, body: input.body },
        }),
      },
    )
    const id = payload.messages?.[0]?.id
    if (!id) throw new WhatsAppCloudError('provider_error')
    return { id }
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' })
  }

  private async request<T>(
    path: string,
    init: Pick<RequestInit, 'method' | 'body'>,
  ): Promise<T> {
    const response = await this.fetcher(
      `https://graph.facebook.com/${this.config.graphApiVersion}/${path}`,
      {
        ...init,
        headers: {
          authorization: `Bearer ${this.config.accessToken}`,
          'content-type': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    )
    const body = (await response.json().catch(() => ({}))) as T & GraphErrorBody
    if (!response.ok) {
      const code = body.error?.code
      throw new WhatsAppCloudError(
        response.status === 401 || response.status === 403 || code === 190
          ? 'unauthorized'
          : response.status === 404
            ? 'not_found'
            : response.status === 429
              ? 'rate_limited'
              : 'provider_error',
      )
    }
    return body
  }
}

class WhatsAppCloudError extends Error {
  constructor(
    readonly reason: Exclude<
      NonNullable<WhatsAppCloudDiagnostic['reason']>,
      'not_configured' | 'timeout'
    >,
  ) {
    super(`WHATSAPP_CLOUD_${reason.toUpperCase()}`)
  }
}

export function readWhatsAppCloudConfig(
  environment: NodeJS.ProcessEnv = process.env,
): WhatsAppCloudConfig | null {
  const accessToken = environment.META_WHATSAPP_ACCESS_TOKEN?.trim()
  const appId = environment.META_APP_ID?.trim()
  const phoneNumberId = environment.META_WHATSAPP_PHONE_NUMBER_ID?.trim()
  const businessAccountId =
    environment.META_WHATSAPP_BUSINESS_ACCOUNT_ID?.trim()
  const graphApiVersion = environment.META_GRAPH_API_VERSION?.trim()
  if (
    !appId ||
    !accessToken ||
    !phoneNumberId ||
    !businessAccountId ||
    !graphApiVersion
  )
    return null
  return {
    appId,
    accessToken,
    phoneNumberId,
    businessAccountId,
    graphApiVersion,
  }
}

export function normalizeWhatsAppWebhook(
  payload: unknown,
): readonly NormalizedWhatsAppEvent[] {
  if (!isRecord(payload) || payload.object !== 'whatsapp_business_account')
    return []
  const events: NormalizedWhatsAppEvent[] = []
  for (const entry of asRecords(payload.entry)) {
    for (const change of asRecords(entry.changes)) {
      if (change.field !== 'messages' || !isRecord(change.value)) continue
      const value = change.value
      const metadata = isRecord(value.metadata) ? value.metadata : {}
      const phoneNumberId = asString(metadata.phone_number_id)
      if (!phoneNumberId) continue
      const names = new Map(
        asRecords(value.contacts).flatMap((contact) => {
          const waId = asString(contact.wa_id)
          const profile = isRecord(contact.profile) ? contact.profile : {}
          const name = asString(profile.name)
          return waId && name ? [[waId, name] as const] : []
        }),
      )
      for (const message of asRecords(value.messages)) {
        const externalId = asString(message.id)
        const from = asString(message.from)
        const type = asString(message.type)
        if (!externalId || !from || !type) continue
        const text = isRecord(message.text) ? message.text : {}
        const media = isRecord(message[type]) ? message[type] : {}
        const contactName = names.get(from)
        const mediaId = asString(media.id)
        const mimeType = asString(media.mime_type)
        const body =
          asString(text.body) ??
          asString(media.caption) ??
          (type === 'audio'
            ? '[Áudio]'
            : type === 'image'
              ? '[Imagem]'
              : type === 'document'
                ? '[Documento]'
                : undefined)
        events.push({
          kind: 'message',
          phoneNumberId,
          externalId,
          from,
          ...(contactName ? { contactName } : {}),
          type,
          ...(body ? { body } : {}),
          ...(mediaId ? { mediaId } : {}),
          ...(mimeType ? { mimeType } : {}),
          occurredAt: parseTimestamp(message.timestamp),
        })
      }
      for (const status of asRecords(value.statuses)) {
        const externalId = asString(status.id)
        const state = asString(status.status)
        if (
          !externalId ||
          !state ||
          !['sent', 'delivered', 'read', 'failed'].includes(state)
        )
          continue
        const firstError = asRecords(status.errors)[0]
        const errorCode =
          firstError && typeof firstError.code === 'number'
            ? firstError.code
            : undefined
        events.push({
          kind: 'status',
          phoneNumberId,
          externalId,
          status: state as NormalizedWhatsAppStatus['status'],
          occurredAt: parseTimestamp(status.timestamp),
          ...(errorCode === undefined ? {} : { errorCode }),
        })
      }
    }
  }
  return events
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecords(value: unknown): readonly Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function parseTimestamp(value: unknown): Date {
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1_000)
    : new Date()
}
