export interface EventMetadata {
  readonly correlationId: string
  readonly causationId?: string
  readonly actorId?: string
  readonly organizationId?: string
}

export interface IntegrationEvent<TPayload = unknown> {
  readonly eventId: string
  readonly eventType: string
  readonly eventVersion: number
  readonly occurredAt: string
  readonly source: string
  readonly payload: TPayload
  readonly metadata: EventMetadata
}

export type EventHandler<TEvent extends IntegrationEvent = IntegrationEvent> = (
  event: TEvent,
) => Promise<void>

export interface EventBus {
  publish(events: readonly IntegrationEvent[]): Promise<void>
  subscribe(eventType: string, handler: EventHandler): () => void
}

export class InMemoryEventBus implements EventBus {
  readonly #handlers = new Map<string, Set<EventHandler>>()

  async publish(events: readonly IntegrationEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = [...(this.#handlers.get(event.eventType) ?? [])]
      await Promise.all(handlers.map(async (handler) => handler(event)))
    }
  }

  subscribe(eventType: string, handler: EventHandler): () => void {
    const handlers = this.#handlers.get(eventType) ?? new Set<EventHandler>()
    handlers.add(handler)
    this.#handlers.set(eventType, handlers)
    return () => handlers.delete(handler)
  }
}
