import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import {
  createDatabaseClient,
  type DatabaseClient,
  type DatabaseTransaction,
  withTenant,
} from '@nexo/database'
import { assertAuthorized, type PermissionKey } from '@nexo/organization'
import { assertConversationTransition } from '@nexo/inbox'
import {
  Phase1Error,
  type AuthPrincipal,
  type RequestContext,
} from '../phase1/phase1.service.js'

@Injectable()
export class InboxService {
  #database: DatabaseClient | null = null
  async list(
    principal: AuthPrincipal,
    input: { status?: string; cursor?: string; limit?: number },
  ) {
    const org = this.#org(principal)
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 100)
    return this.#allowed(principal, 'conversation.read', async (tx) => {
      const rows = await tx.conversation.findMany({
        where: {
          organizationId: org,
          ...(input.status ? { status: input.status as never } : {}),
        },
        orderBy: { lastMessageAt: 'desc' },
        take: limit + 1,
      })
      return {
        items: rows.slice(0, limit),
        nextCursor: rows.length > limit ? (rows[limit - 1]?.id ?? null) : null,
      }
    })
  }
  async createInbox(
    principal: AuthPrincipal,
    name: string,
    context: RequestContext,
  ) {
    const org = this.#org(principal)
    return this.#allowed(principal, 'inbox.manage', (tx) =>
      tx.inbox
        .create({ data: { organizationId: org, name } })
        .then(async (row) => {
          await this.#outbox(tx, context, org, 'InboxCreated', row.id)
          return row
        }),
    )
  }
  async simulateInbound(
    principal: AuthPrincipal,
    input: { contactName: string; identifier: string; body: string },
    context: RequestContext,
  ) {
    const org = this.#org(principal)
    return this.#allowed(principal, 'conversation.update', async (tx) => {
      const inbox = await tx.inbox.upsert({
        where: {
          organizationId_name: { organizationId: org, name: 'Simulador' },
        },
        create: { organizationId: org, name: 'Simulador' },
        update: {},
      })
      let channel = await tx.contactChannel.findUnique({
        where: {
          organizationId_provider_identifier: {
            organizationId: org,
            provider: 'SIMULATOR',
            identifier: input.identifier,
          },
        },
      })
      if (!channel) {
        const contact = await tx.contact.create({
          data: {
            organizationId: org,
            name: input.contactName,
            source: 'simulator',
          },
        })
        channel = await tx.contactChannel.create({
          data: {
            organizationId: org,
            contactId: contact.id,
            provider: 'SIMULATOR',
            identifier: input.identifier,
          },
        })
      }
      let conversation = await tx.conversation.findFirst({
        where: {
          organizationId: org,
          inboxId: inbox.id,
          contactId: channel.contactId,
          status: { not: 'CLOSED' },
        },
      })
      conversation ??= await tx.conversation.create({
        data: {
          organizationId: org,
          inboxId: inbox.id,
          contactId: channel.contactId,
        },
      })
      const message = await tx.message.create({
        data: {
          organizationId: org,
          conversationId: conversation.id,
          externalId: `sim:${randomUUID()}`,
          direction: 'INBOUND',
          status: 'RECEIVED',
          body: input.body,
        },
      })
      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: message.createdAt,
        },
      })
      await this.#outbox(tx, context, org, 'MessageReceived', conversation.id)
      return { conversationId: conversation.id, message }
    })
  }
  async reply(
    principal: AuthPrincipal,
    conversationId: string,
    body: string,
    context: RequestContext,
  ) {
    const org = this.#org(principal)
    return this.#allowed(principal, 'conversation.reply', async (tx) => {
      await tx.conversation.findFirstOrThrow({
        where: { organizationId: org, id: conversationId },
      })
      const message = await tx.message.create({
        data: {
          organizationId: org,
          conversationId,
          externalId: `sim:${randomUUID()}`,
          direction: 'OUTBOUND',
          status: 'SENT',
          body,
        },
      })
      await tx.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0, lastMessageAt: message.createdAt },
      })
      await this.#outbox(tx, context, org, 'MessageSent', conversationId)
      return message
    })
  }
  async updateConversation(
    principal: AuthPrincipal,
    id: string,
    input: { status?: string; assigneeMembershipId?: string; teamId?: string },
    context: RequestContext,
  ) {
    const org = this.#org(principal)
    return this.#allowed(
      principal,
      input.assigneeMembershipId || input.teamId
        ? 'conversation.assign'
        : 'conversation.update',
      async (tx) => {
        const current = await tx.conversation.findFirstOrThrow({
          where: { organizationId: org, id },
        })
        if (input.status)
          assertConversationTransition(current.status, input.status as never)
        const row = await tx.conversation.update({
          where: { id },
          data: {
            ...(input.status ? { status: input.status as never } : {}),
            ...(input.assigneeMembershipId
              ? { assigneeMembershipId: input.assigneeMembershipId }
              : {}),
            ...(input.teamId ? { teamId: input.teamId } : {}),
          },
        })
        await this.#outbox(
          tx,
          context,
          org,
          input.status ? 'ConversationStatusChanged' : 'ConversationAssigned',
          id,
        )
        return row
      },
    )
  }
  async addNote(
    principal: AuthPrincipal,
    conversationId: string,
    body: string,
    context: RequestContext,
  ) {
    const org = this.#org(principal)
    return this.#allowed(principal, 'note.create', async (tx) => {
      const membership = await tx.membership.findUniqueOrThrow({
        where: {
          organizationId_userId: {
            organizationId: org,
            userId: principal.userId,
          },
        },
      })
      const row = await tx.internalNote.create({
        data: {
          organizationId: org,
          conversationId,
          authorMembershipId: membership.id,
          body,
        },
      })
      await this.#outbox(
        tx,
        context,
        org,
        'InternalNoteCreated',
        conversationId,
      )
      return row
    })
  }
  async createTag(
    principal: AuthPrincipal,
    name: string,
    color: string | undefined,
  ) {
    const org = this.#org(principal)
    return this.#allowed(principal, 'tag.manage', (tx) =>
      tx.tag.create({
        data: { organizationId: org, name, ...(color ? { color } : {}) },
      }),
    )
  }
  async listConversationTags(principal: AuthPrincipal, conversationId: string) {
    const org = this.#org(principal)
    return this.#allowed(principal, 'conversation.read', async (tx) => {
      await tx.conversation.findFirstOrThrow({
        where: { organizationId: org, id: conversationId },
      })
      const rows = await tx.conversationTag.findMany({
        where: { organizationId: org, conversationId },
      })
      return Promise.all(
        rows.map(({ tagId }) =>
          tx.tag.findFirstOrThrow({
            where: { organizationId: org, id: tagId },
          }),
        ),
      )
    })
  }
  async addConversationTag(
    principal: AuthPrincipal,
    conversationId: string,
    tagId: string,
    context: RequestContext,
  ) {
    const org = this.#org(principal)
    return this.#allowed(principal, 'conversation.update', async (tx) => {
      await tx.conversation.findFirstOrThrow({
        where: { organizationId: org, id: conversationId },
      })
      await tx.tag.findFirstOrThrow({
        where: { organizationId: org, id: tagId },
      })
      const row = await tx.conversationTag.create({
        data: { organizationId: org, conversationId, tagId },
      })
      await this.#outbox(
        tx,
        context,
        org,
        'ConversationTagAdded',
        conversationId,
        { tagId },
      )
      return row
    })
  }
  async removeConversationTag(
    principal: AuthPrincipal,
    conversationId: string,
    tagId: string,
    context: RequestContext,
  ) {
    const org = this.#org(principal)
    return this.#allowed(principal, 'conversation.update', async (tx) => {
      const deleted = await tx.conversationTag.deleteMany({
        where: { organizationId: org, conversationId, tagId },
      })
      if (deleted.count !== 1)
        throw new Phase1Error('not_found', 404, 'Not found')
      await this.#outbox(
        tx,
        context,
        org,
        'ConversationTagRemoved',
        conversationId,
        { tagId },
      )
    })
  }
  async dashboard(principal: AuthPrincipal) {
    const org = this.#org(principal)
    return this.#allowed(principal, 'inbox.read', async (tx) => ({
      open: await tx.conversation.count({
        where: { organizationId: org, status: 'OPEN' },
      }),
      contacts: await tx.contact.count({ where: { organizationId: org } }),
    }))
  }
  async #allowed<T>(
    principal: AuthPrincipal,
    permission: PermissionKey,
    work: (tx: DatabaseTransaction) => Promise<T>,
  ) {
    const org = this.#org(principal)
    return withTenant(
      this.#db(),
      { userId: principal.userId, organizationId: org },
      async (tx) => {
        const m = await tx.membership.findUnique({
          where: {
            organizationId_userId: {
              organizationId: org,
              userId: principal.userId,
            },
          },
          include: {
            organization: true,
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        })
        if (!m) throw new Phase1Error('not_found', 404, 'Not found')
        assertAuthorized({
          permission,
          permissions: new Set(
            m.role.permissions.map((p) => p.permission.key as PermissionKey),
          ),
          membershipStatus: m.status,
          organizationStatus: m.organization.status,
        })
        return work(tx)
      },
    )
  }
  async #outbox(
    tx: DatabaseTransaction,
    context: RequestContext,
    organizationId: string,
    eventType: string,
    aggregateId: string,
    payload: Readonly<Record<string, unknown>> = {},
  ) {
    await tx.outboxEvent.create({
      data: {
        id: randomUUID(),
        idempotencyKey: `${context.correlationId}:${eventType}:${aggregateId}`,
        eventType,
        eventVersion: 1,
        source: 'nexo.inbox',
        correlationId: context.correlationId,
        occurredAt: new Date(),
        organizationId,
        aggregateId,
        payload: { aggregateId, ...payload },
      },
    })
  }
  #org(p: AuthPrincipal) {
    if (!p.organizationId)
      throw new Phase1Error(
        'organization_required',
        409,
        'Select an organization',
      )
    return p.organizationId
  }
  #db() {
    if (!this.#database) {
      if (!process.env.DATABASE_URL)
        throw new Phase1Error(
          'database_unavailable',
          503,
          'Database is not configured',
        )
      this.#database = createDatabaseClient(process.env.DATABASE_URL)
    }
    return this.#database
  }
}
