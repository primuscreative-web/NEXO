export type NotificationTemplate =
  | 'verify-email'
  | 'reset-password'
  | 'organization-invitation'

export interface EmailMessage {
  readonly to: string
  readonly template: NotificationTemplate
  readonly parameters: Readonly<Record<string, string>>
  readonly idempotencyKey: string
}

export interface EmailDeliveryPort {
  send(message: EmailMessage): Promise<void>
}

export class InMemoryEmailDeliveryAdapter implements EmailDeliveryPort {
  readonly messages: EmailMessage[] = []
  readonly #processed = new Set<string>()

  send(message: EmailMessage): Promise<void> {
    if (!this.#processed.has(message.idempotencyKey)) {
      this.messages.push(message)
      this.#processed.add(message.idempotencyKey)
    }
    return Promise.resolve()
  }
}
