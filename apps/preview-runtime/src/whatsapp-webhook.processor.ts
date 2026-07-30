import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type { OnModuleDestroy } from '@nestjs/common'
import {
  createDatabaseClient,
  type DatabaseClient,
  type DatabaseJsonInput,
  type DatabaseTransaction,
  withTenant,
} from '@nexo/database'
import {
  normalizeWhatsAppWebhook,
  type NormalizedWhatsAppEvent,
} from '@nexo/whatsapp'

export interface WhatsAppWebhookProcessingResult {
  readonly configured: boolean
  readonly processed: number
  readonly duplicates: number
  readonly ignored: number
}

@Injectable()
export class WhatsAppWebhookProcessor implements OnModuleDestroy {
  readonly #databaseUrl = process.env.DATABASE_URL?.trim()
  readonly #organizationId = process.env.META_WHATSAPP_ORGANIZATION_ID?.trim()
  readonly #phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim()
  readonly #inboxName =
    process.env.META_WHATSAPP_INBOX_NAME?.trim() ?? 'WhatsApp'
  #database: DatabaseClient | null = null

  async process(payload: unknown): Promise<WhatsAppWebhookProcessingResult> {
    const databaseUrl = this.#databaseUrl
    const organizationId = this.#organizationId
    const phoneNumberId = this.#phoneNumberId
    if (!databaseUrl || !organizationId || !phoneNumberId)
      return { configured: false, processed: 0, duplicates: 0, ignored: 0 }

    const allEvents = normalizeWhatsAppWebhook(payload)
    const events = allEvents.filter(
      (event) => event.phoneNumberId === phoneNumberId,
    )
    const ignored = allEvents.length - events.length
    if (events.length === 0)
      return { configured: true, processed: 0, duplicates: 0, ignored }

    return withTenant(
      this.#db(databaseUrl),
      {
        userId: 'meta-whatsapp-webhook',
        organizationId,
      },
      async (transaction) => {
        const inbox = await transaction.inbox.upsert({
          where: {
            organizationId_name: {
              organizationId,
              name: this.#inboxName,
            },
          },
          create: {
            organizationId,
            name: this.#inboxName,
          },
          update: {},
        })
        const channelAccount = await transaction.channelAccount.upsert({
          where: {
            organizationId_provider_externalAccountId: {
              organizationId,
              provider: 'WHATSAPP',
              externalAccountId: phoneNumberId,
            },
          },
          create: {
            organizationId,
            inboxId: inbox.id,
            provider: 'WHATSAPP',
            displayName: this.#inboxName,
            externalAccountId: phoneNumberId,
          },
          update: { inboxId: inbox.id, enabled: true },
        })

        let processed = 0
        let duplicates = 0
        for (const event of events) {
          const result = await this.#processEvent(
            transaction,
            organizationId,
            inbox.id,
            channelAccount.id,
            event,
          )
          if (result === 'duplicate') duplicates += 1
          else processed += 1
        }
        return { configured: true, processed, duplicates, ignored }
      },
    )
  }

  async onModuleDestroy(): Promise<void> {
    await this.#database?.$disconnect()
  }

  async #processEvent(
    transaction: DatabaseTransaction,
    organizationId: string,
    inboxId: string,
    channelAccountId: string,
    event: NormalizedWhatsAppEvent,
  ): Promise<'processed' | 'duplicate'> {
    const eventExternalId =
      event.kind === 'message'
        ? `message:${event.externalId}`
        : `status:${event.externalId}:${event.status}:${event.occurredAt.toISOString()}`
    const previous = await transaction.channelEvent.findUnique({
      where: {
        organizationId_channelAccountId_externalId: {
          organizationId,
          channelAccountId,
          externalId: eventExternalId,
        },
      },
    })
    if (previous) return 'duplicate'

    await transaction.channelEvent.create({
      data: {
        organizationId,
        channelAccountId,
        externalId: eventExternalId,
        type:
          event.kind === 'message'
            ? `message.${event.type}`
            : `message.${event.status}`,
        receivedAt: event.occurredAt,
      },
    })

    if (event.kind === 'status') {
      const status = {
        sent: 'SENT',
        delivered: 'DELIVERED',
        read: 'READ',
        failed: 'FAILED',
      }[event.status] as 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
      await transaction.message.updateMany({
        where: {
          organizationId,
          externalId: event.externalId,
        },
        data: {
          status,
          ...(event.errorCode === undefined
            ? {}
            : {
                metadata: {
                  provider: 'whatsapp',
                  errorCode: event.errorCode,
                },
              }),
        },
      })
      return 'processed'
    }

    let contactChannel = await transaction.contactChannel.findUnique({
      where: {
        organizationId_provider_identifier: {
          organizationId,
          provider: 'WHATSAPP',
          identifier: event.from,
        },
      },
    })
    if (!contactChannel) {
      const contact = await transaction.contact.create({
        data: {
          organizationId,
          name: event.contactName ?? event.from,
          phone: event.from,
          source: 'whatsapp',
        },
      })
      contactChannel = await transaction.contactChannel.create({
        data: {
          organizationId,
          contactId: contact.id,
          provider: 'WHATSAPP',
          identifier: event.from,
        },
      })
    }
    let conversation = await transaction.conversation.findFirst({
      where: {
        organizationId,
        inboxId,
        contactId: contactChannel.contactId,
        status: { not: 'CLOSED' },
      },
    })
    conversation ??= await transaction.conversation.create({
      data: {
        organizationId,
        inboxId,
        contactId: contactChannel.contactId,
      },
    })
    const metadata: DatabaseJsonInput = {
      provider: 'whatsapp',
      type: event.type,
      ...(event.mediaId ? { mediaId: event.mediaId } : {}),
      ...(event.mimeType ? { mimeType: event.mimeType } : {}),
    }
    const message = await transaction.message.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        externalId: event.externalId,
        direction: 'INBOUND',
        status: 'RECEIVED',
        ...(event.body ? { body: event.body } : {}),
        metadata,
        externalOccurredAt: event.occurredAt,
      },
    })
    await transaction.conversation.update({
      where: { id: conversation.id },
      data: {
        unreadCount: { increment: 1 },
        lastMessageAt: message.createdAt,
      },
    })
    await transaction.outboxEvent.upsert({
      where: {
        idempotencyKey: `whatsapp:${event.externalId}:MessageReceived`,
      },
      create: {
        id: randomUUID(),
        idempotencyKey: `whatsapp:${event.externalId}:MessageReceived`,
        eventType: 'MessageReceived',
        eventVersion: 1,
        source: 'nexo.whatsapp',
        correlationId: randomUUID(),
        occurredAt: event.occurredAt,
        organizationId,
        aggregateId: conversation.id,
        payload: {
          aggregateId: conversation.id,
          messageId: message.id,
          provider: 'whatsapp',
        },
      },
      update: {},
    })
    return 'processed'
  }

  #db(databaseUrl: string): DatabaseClient {
    this.#database ??= createDatabaseClient(databaseUrl)
    return this.#database
  }
}
