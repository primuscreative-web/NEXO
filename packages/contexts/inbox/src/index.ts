export const conversationStatuses = [
  'OPEN',
  'PENDING',
  'RESOLVED',
  'CLOSED',
] as const
export type ConversationStatus = (typeof conversationStatuses)[number]
export const messageStatuses = [
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'RECEIVED',
] as const
export type MessageStatus = (typeof messageStatuses)[number]

export interface NormalizedInboundMessage {
  organizationId: string
  channelAccountId: string
  externalId: string
  contactIdentifier: string
  contactName?: string
  body?: string
  receivedAt: Date
  metadata?: Record<string, unknown>
}

export interface ChannelProvider {
  readonly key: string
  send(input: {
    channelAccountId: string
    externalConversationId?: string
    body: string
    idempotencyKey: string
  }): Promise<{ externalId: string }>
  verifyWebhook?(input: {
    mode?: string
    token?: string
    challenge?: string
  }): string | null
  normalizeWebhook?(payload: unknown): readonly NormalizedInboundMessage[]
}

/** Deterministic adapter used by demos and contract tests before external credentials exist. */
export class SimulatorChannelProvider implements ChannelProvider {
  readonly key = 'simulator'
  async send(input: {
    channelAccountId: string
    externalConversationId?: string
    body: string
    idempotencyKey: string
  }) {
    return { externalId: `sim:${input.idempotencyKey}` }
  }
}

/** Meta Cloud API adapter boundary. Secrets remain in the infrastructure adapter, never in UI state. */
export class WhatsAppChannelProvider implements ChannelProvider {
  readonly key = 'whatsapp'
  constructor(
    private readonly transport: {
      sendText(input: {
        accountId: string
        to: string
        body: string
      }): Promise<{ id: string }>
    },
  ) {}
  async send(input: {
    channelAccountId: string
    externalConversationId?: string
    body: string
    idempotencyKey: string
  }) {
    if (!input.externalConversationId)
      throw new Error('whatsapp_recipient_required')
    const result = await this.transport.sendText({
      accountId: input.channelAccountId,
      to: input.externalConversationId,
      body: input.body,
    })
    return { externalId: result.id }
  }
}

export function assertConversationTransition(
  current: ConversationStatus,
  next: ConversationStatus,
): void {
  const allowed: Record<ConversationStatus, readonly ConversationStatus[]> = {
    OPEN: ['PENDING', 'RESOLVED', 'CLOSED'],
    PENDING: ['OPEN', 'RESOLVED', 'CLOSED'],
    RESOLVED: ['OPEN', 'CLOSED'],
    CLOSED: ['OPEN'],
  }
  if (!allowed[current].includes(next))
    throw new Error('invalid_conversation_transition')
}
