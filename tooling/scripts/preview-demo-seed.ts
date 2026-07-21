import { randomUUID } from 'node:crypto'
import argon2 from 'argon2'
import pg from 'pg'

async function main(): Promise<void> {
  const slug = 'nexo-demo-preview'
  const demoPassword = process.env.PREVIEW_DEMO_PASSWORD

  if (
    process.env.APP_ENV !== 'preview' ||
    process.env.PREVIEW_CONFIRM !== 'NEXO_PREVIEW'
  )
    throw new Error('Refusing demo seed outside explicit preview confirmation')
  if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL')
  if (!demoPassword || demoPassword.length < 12)
    throw new Error('PREVIEW_DEMO_PASSWORD must contain at least 12 characters')

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  async function removeDemo(): Promise<void> {
    const organization = await client.query(
      'SELECT "id" FROM "organization_organizations" WHERE "slug"=$1',
      [slug],
    )
    const organizationId = organization.rows[0]?.id as string | undefined
    if (!organizationId) return
    for (const table of [
      'inbox_conversation_tags',
      'inbox_internal_notes',
      'inbox_messages',
      'inbox_channel_events',
      'inbox_conversations',
      'inbox_channel_accounts',
      'crm_contact_channels',
      'inbox_tags',
      'crm_contacts',
      'inbox_inboxes',
      'platform_outbox_events',
      'organization_memberships',
      'organization_roles',
    ])
      await client.query(`DELETE FROM "${table}" WHERE "organizationId"=$1`, [
        organizationId,
      ])
    await client.query(
      'DELETE FROM "organization_organizations" WHERE "id"=$1',
      [organizationId],
    )
    await client.query(
      `DELETE FROM "identity_user_credentials" WHERE "userId" IN (
      SELECT "id" FROM "identity_users" WHERE "normalizedEmail" LIKE 'demo.%@nexo.preview.invalid'
    )`,
    )
    await client.query(
      'DELETE FROM "identity_users" WHERE "normalizedEmail" LIKE \'demo.%@nexo.preview.invalid\'',
    )
  }

  if (process.argv.includes('--cleanup')) {
    try {
      await client.query('BEGIN')
      await removeDemo()
      await client.query('COMMIT')
      console.log('Synthetic demo preview data removed.')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      await client.end()
    }
    process.exit(0)
  }

  try {
    await client.query('BEGIN')
    await removeDemo()
    const organizationId = randomUUID()
    const inboxId = randomUUID()
    const passwordHash = await argon2.hash(demoPassword, {
      type: argon2.argon2id,
    })
    await client.query(
      'INSERT INTO "organization_organizations" ("id","name","slug","updatedAt") VALUES ($1,$2,$3,now())',
      [organizationId, 'NEXO Demo', slug],
    )
    await client.query(
      'INSERT INTO "inbox_inboxes" ("id","organizationId","name","updatedAt") VALUES ($1,$2,$3,now())',
      [inboxId, organizationId, 'Simulador de Preview'],
    )
    const permissions = [
      'inbox.read',
      'conversation.read',
      'conversation.reply',
      'conversation.assign',
      'conversation.update',
      'tag.manage',
      'note.create',
      'membership.read',
      'team.read',
    ]
    const permissionIds = new Map<string, string>()
    for (const key of permissions) {
      const result = await client.query(
        'INSERT INTO "organization_permissions" ("id","key","description") VALUES ($1,$2,$2) ON CONFLICT ("key") DO UPDATE SET "description"=EXCLUDED."description" RETURNING "id"',
        [randomUUID(), key],
      )
      permissionIds.set(key, result.rows[0].id as string)
    }
    const roles = new Map<string, string>()
    for (const [key, name] of [
      ['admin', 'Administrador'],
      ['agent', 'Atendente'],
    ] as const) {
      const id = randomUUID()
      roles.set(key, id)
      await client.query(
        'INSERT INTO "organization_roles" ("id","organizationId","key","name","updatedAt") VALUES ($1,$2,$3,$4,now())',
        [id, organizationId, key, name],
      )
      const roleKeys =
        key === 'admin'
          ? permissions
          : [
              'inbox.read',
              'conversation.read',
              'conversation.reply',
              'conversation.update',
              'note.create',
            ]
      for (const permissionKey of roleKeys)
        await client.query(
          'INSERT INTO "organization_role_permissions" ("organizationId","roleId","permissionId") VALUES ($1,$2,$3)',
          [organizationId, id, permissionIds.get(permissionKey)],
        )
    }
    const actors: Array<{
      membershipId: string
      userId: string
      name: string
    }> = []
    for (const [index, name, email, role] of [
      [0, 'NEXO Demo Admin', 'demo.admin@nexo.preview.invalid', 'admin'],
      [1, 'Aline Atendimento', 'demo.aline@nexo.preview.invalid', 'agent'],
      [2, 'Caio Atendimento', 'demo.caio@nexo.preview.invalid', 'agent'],
    ] as const) {
      const userId = randomUUID()
      const membershipId = randomUUID()
      actors.push({ membershipId, userId, name })
      await client.query(
        'INSERT INTO "identity_users" ("id","email","normalizedEmail","name","emailVerifiedAt","updatedAt") VALUES ($1,$2,$2,$3,now(),now())',
        [userId, email, name],
      )
      await client.query(
        'INSERT INTO "identity_user_credentials" ("userId","passwordHash") VALUES ($1,$2)',
        [userId, passwordHash],
      )
      await client.query(
        'INSERT INTO "organization_memberships" ("id","organizationId","userId","roleId","status","acceptedAt","updatedAt") VALUES ($1,$2,$3,$4,\'ACTIVE\',now(),now())',
        [membershipId, organizationId, userId, roles.get(role)],
      )
      void index
    }
    const tags = [
      ['Novo', '#2563eb'],
      ['Prioridade', '#dc2626'],
      ['Financeiro', '#7c3aed'],
      ['Retorno', '#d97706'],
    ] as const
    const tagIds = new Map<string, string>()
    for (const [name, color] of tags) {
      const id = randomUUID()
      tagIds.set(name, id)
      await client.query(
        'INSERT INTO "inbox_tags" ("id","organizationId","name","color") VALUES ($1,$2,$3,$4)',
        [id, organizationId, name, color],
      )
    }
    const statuses = ['OPEN', 'PENDING', 'CLOSED'] as const
    for (let index = 0; index < 12; index += 1) {
      const contactId = randomUUID()
      const conversationId = randomUUID()
      const status = statuses[index % statuses.length]
      const actor = actors[(index % 2) + 1]
      const createdAt = new Date(Date.now() - index * 3_600_000)
      await client.query(
        'INSERT INTO "crm_contacts" ("id","organizationId","name","phone","company","source","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [
          contactId,
          organizationId,
          `Contato Demo ${index + 1}`,
          `+551199900${String(index).padStart(2, '0')}`,
          index % 2 ? 'Empresa Demo' : null,
          'preview-demo',
          createdAt,
        ],
      )
      await client.query(
        'INSERT INTO "crm_contact_channels" ("id","organizationId","contactId","provider","identifier") VALUES ($1,$2,$3,\'SIMULATOR\',$4)',
        [randomUUID(), organizationId, contactId, `demo-${index + 1}`],
      )
      await client.query(
        'INSERT INTO "inbox_conversations" ("id","organizationId","inboxId","contactId","status","priority","assigneeMembershipId","lastMessageAt","unreadCount","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$8)',
        [
          conversationId,
          organizationId,
          inboxId,
          contactId,
          status,
          index % 4 === 0 ? 1 : 0,
          actor.membershipId,
          createdAt,
          index % 3,
        ],
      )
      for (const [direction, body, messageStatus, offset, metadata] of [
        [
          'INBOUND',
          `Olá, esta é a mensagem sintética ${index + 1}.`,
          'RECEIVED',
          12,
          null,
        ],
        [
          'OUTBOUND',
          'Olá! Recebemos sua mensagem e vamos ajudar.',
          'READ',
          8,
          null,
        ],
        [
          'INBOUND',
          index % 3 === 0
            ? 'Imagem sintética anexada para demonstração.'
            : index % 3 === 1
              ? 'Áudio sintético disponível para demonstração.'
              : 'Obrigado pelo retorno.',
          'RECEIVED',
          2,
          index % 3 === 0
            ? { kind: 'image', preview: 'synthetic' }
            : index % 3 === 1
              ? { kind: 'audio', durationSeconds: 12 }
              : null,
        ],
      ] as const) {
        await client.query(
          'INSERT INTO "inbox_messages" ("id","organizationId","conversationId","externalId","direction","status","body","metadata","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [
            randomUUID(),
            organizationId,
            conversationId,
            `demo:${randomUUID()}`,
            direction,
            messageStatus,
            body,
            metadata ? JSON.stringify(metadata) : null,
            new Date(createdAt.getTime() - offset * 60_000),
          ],
        )
      }
      await client.query(
        'INSERT INTO "inbox_internal_notes" ("id","organizationId","conversationId","authorMembershipId","body","createdAt") VALUES ($1,$2,$3,$4,$5,$6)',
        [
          randomUUID(),
          organizationId,
          conversationId,
          actors[0].membershipId,
          'Nota interna sintética: acompanhar retorno deste contato.',
          new Date(createdAt.getTime() - 5 * 60_000),
        ],
      )
      const tagId = tagIds.get(tags[index % tags.length][0])
      await client.query(
        'INSERT INTO "inbox_conversation_tags" ("id","organizationId","conversationId","tagId") VALUES ($1,$2,$3,$4)',
        [randomUUID(), organizationId, conversationId, tagId],
      )
      await client.query(
        'INSERT INTO "platform_outbox_events" ("id","idempotencyKey","eventType","eventVersion","source","correlationId","occurredAt","organizationId","aggregateId","payload","status","publishedAt") VALUES ($1,$2,$3,1,$4,$5,$6,$7,$8,$9,\'PUBLISHED\',now())',
        [
          randomUUID(),
          `preview-demo:${conversationId}`,
          'MessageReceived',
          'nexo.inbox',
          randomUUID(),
          createdAt,
          organizationId,
          conversationId,
          JSON.stringify({ aggregateId: conversationId, synthetic: true }),
        ],
      )
    }
    await client.query('COMMIT')
    console.log('Synthetic NEXO Demo preview data is ready.')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
  }
}

void main().catch(() => {
  process.stderr.write('Preview demo seed failed.\n')
  process.exitCode = 1
})
