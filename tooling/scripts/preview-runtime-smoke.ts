import { randomUUID } from 'node:crypto'
import { Queue } from 'bullmq'
import { createDatabaseClient, withTenant } from '@nexo/database'
import { InboxService } from '../../apps/api/src/inbox/inbox.service.js'

async function main(): Promise<void> {
  if (
    process.env.APP_ENV !== 'preview' ||
    process.env.PREVIEW_CONFIRM !== 'NEXO_PREVIEW'
  )
    throw new Error(
      'Refusing preview runtime smoke outside explicit preview confirmation',
    )
  if (!process.env.DATABASE_URL || !process.env.REDIS_URL)
    throw new Error('Missing preview runtime connection configuration')

  const database = createDatabaseClient(process.env.DATABASE_URL)
  const slug = 'nexo-preview-smoke'

  try {
    const organization = await database.organization.findUniqueOrThrow({
      where: { slug },
    })
    const actor = await database.user.findUniqueOrThrow({
      where: { normalizedEmail: 'preview-inbox-user@example.invalid' },
    })
    const membership = await database.membership.findUniqueOrThrow({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: actor.id,
        },
      },
    })
    const conversation = await database.conversation.findFirstOrThrow({
      where: { organizationId: organization.id },
    })
    const principal = {
      userId: actor.id,
      sessionId: randomUUID(),
      organizationId: organization.id,
    }
    const service = new InboxService()
    const assignment = await service.updateConversation(
      principal,
      conversation.id,
      { assigneeMembershipId: membership.id },
      { correlationId: randomUUID() },
    )
    if (assignment.assigneeMembershipId !== membership.id)
      throw new Error('Inbox assignment was not persisted')
    const note = await service.addNote(
      principal,
      conversation.id,
      'Preview runtime smoke note',
      { correlationId: randomUUID() },
    )
    if (note.authorMembershipId !== membership.id)
      throw new Error('Inbox note was not persisted')
    const tenantConversationCount = await withTenant(
      database,
      { userId: actor.id, organizationId: organization.id },
      (transaction) =>
        transaction.conversation.count({
          where: { organizationId: organization.id, id: conversation.id },
        }),
    )
    if (tenantConversationCount !== 1)
      throw new Error('Tenant context did not resolve the seeded conversation')
    const events = await database.outboxEvent.findMany({
      where: {
        organizationId: organization.id,
        aggregateId: conversation.id,
        eventType: { in: ['ConversationAssigned', 'InternalNoteCreated'] },
      },
      select: { id: true, status: true },
    })
    if (events.length !== 2)
      throw new Error('Inbox Outbox events were not atomically persisted')
    const deadline = Date.now() + 20_000
    while (Date.now() < deadline) {
      const pending = await database.outboxEvent.count({
        where: {
          id: { in: events.map((event) => event.id) },
          status: 'PENDING',
        },
      })
      if (pending === 0) break
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    const published = await database.outboxEvent.count({
      where: {
        id: { in: events.map((event) => event.id) },
        status: 'PUBLISHED',
      },
    })
    if (published !== events.length)
      throw new Error('Outbox relay did not publish smoke events')
    const redisUrl = new URL(process.env.REDIS_URL)
    const queue = new Queue('nexo-integration-events', {
      connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port || 6379),
        ...(redisUrl.username
          ? { username: decodeURIComponent(redisUrl.username) }
          : {}),
        ...(redisUrl.password
          ? { password: decodeURIComponent(redisUrl.password) }
          : {}),
        ...(redisUrl.protocol === 'rediss:' ? { tls: {} } : {}),
      },
    })
    try {
      await queue.obliterate({ force: true })
    } finally {
      await queue.close()
    }
    console.log(
      'Preview runtime smoke passed: authorized Inbox assignment and note, tenant context, Outbox relay, and scoped queue cleanup.',
    )
  } finally {
    await database.$disconnect()
  }
}

void main().catch(() => {
  process.stderr.write('Preview runtime smoke failed.\n')
  process.exitCode = 1
})
