import { randomUUID } from 'node:crypto'
import pg from 'pg'

if (
  process.env.APP_ENV !== 'preview' ||
  process.env.PREVIEW_CONFIRM !== 'NEXO_PREVIEW'
)
  throw new Error('Refusing preview seed outside explicit preview confirmation')
if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
const slug = 'nexo-preview-smoke'
await client.connect()
try {
  await client.query('BEGIN')
  if (process.argv.includes('--cleanup')) {
    const organization = await client.query(
      'SELECT "id" FROM "organization_organizations" WHERE "slug"=$1',
      [slug],
    )
    if (organization.rows[0]) {
      const organizationId = organization.rows[0].id
      await client.query(
        'DELETE FROM "inbox_conversation_tags" WHERE "organizationId"=$1',
        [organizationId],
      )
      await client.query(
        'DELETE FROM "inbox_internal_notes" WHERE "organizationId"=$1',
        [organizationId],
      )
      await client.query(
        'DELETE FROM "inbox_messages" WHERE "organizationId"=$1',
        [organizationId],
      )
      await client.query(
        'DELETE FROM "inbox_channel_events" WHERE "organizationId"=$1',
        [organizationId],
      )
      await client.query(
        'DELETE FROM "inbox_conversations" WHERE "organizationId"=$1',
        [organizationId],
      )
      await client.query(
        'DELETE FROM "inbox_channel_accounts" WHERE "organizationId"=$1',
        [organizationId],
      )
      await client.query(
        'DELETE FROM "crm_contact_channels" WHERE "organizationId"=$1',
        [organizationId],
      )
      await client.query('DELETE FROM "inbox_tags" WHERE "organizationId"=$1', [
        organizationId,
      ])
      await client.query(
        'DELETE FROM "crm_contacts" WHERE "organizationId"=$1',
        [organizationId],
      )
      await client.query(
        'DELETE FROM "inbox_inboxes" WHERE "organizationId"=$1',
        [organizationId],
      )
      await client.query(
        'DELETE FROM "platform_outbox_events" WHERE "organizationId"=$1',
        [organizationId],
      )
      await client.query(
        'DELETE FROM "organization_memberships" WHERE "organizationId"=$1',
        [organizationId],
      )
      await client.query(
        'DELETE FROM "organization_roles" WHERE "organizationId"=$1',
        [organizationId],
      )
      await client.query(
        'DELETE FROM "organization_organizations" WHERE "id"=$1',
        [organizationId],
      )
      await client.query(
        'DELETE FROM "identity_users" WHERE "normalizedEmail"=$1',
        ['preview-inbox-user@example.invalid'],
      )
    }
    await client.query('COMMIT')
    console.log('Synthetic preview data removed.')
    process.exit(0)
  }
  const organizationId = randomUUID()
  const userId = randomUUID()
  const roleId = randomUUID()
  const membershipId = randomUUID()
  const inboxId = randomUUID()
  const contactId = randomUUID()
  const conversationId = randomUUID()
  const organization = await client.query(
    'INSERT INTO "organization_organizations" ("id","name","slug","updatedAt") VALUES ($1,$2,$3,now()) ON CONFLICT ("slug") DO UPDATE SET "updatedAt"=now() RETURNING "id"',
    [organizationId, 'NEXO Preview Smoke', slug],
  )
  const orgId = organization.rows[0].id
  const user = await client.query(
    'INSERT INTO "identity_users" ("id","email","normalizedEmail","name","updatedAt") VALUES ($1,$2,$2,$3,now()) ON CONFLICT ("normalizedEmail") DO UPDATE SET "updatedAt"=now() RETURNING "id"',
    [userId, 'preview-inbox-user@example.invalid', 'Preview Inbox User'],
  )
  await client.query(
    'INSERT INTO "organization_roles" ("id","organizationId","key","name","updatedAt") VALUES ($1,$2,$3,$4,now()) ON CONFLICT ("organizationId","key") DO UPDATE SET "updatedAt"=now() RETURNING "id"',
    [roleId, orgId, 'preview-inbox-operator', 'Preview Inbox Operator'],
  )
  const role = await client.query(
    'SELECT "id" FROM "organization_roles" WHERE "organizationId"=$1 AND "key"=$2',
    [orgId, 'preview-inbox-operator'],
  )
  for (const key of [
    'conversation.assign',
    'conversation.update',
    'note.create',
  ]) {
    const permission = await client.query(
      'INSERT INTO "organization_permissions" ("id","key","description") VALUES ($1,$2,$2) ON CONFLICT ("key") DO UPDATE SET "description"=EXCLUDED."description" RETURNING "id"',
      [randomUUID(), key],
    )
    await client.query(
      'INSERT INTO "organization_role_permissions" ("organizationId","roleId","permissionId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [orgId, role.rows[0].id, permission.rows[0].id],
    )
  }
  await client.query(
    'INSERT INTO "organization_memberships" ("id","organizationId","userId","roleId","status","acceptedAt","updatedAt") VALUES ($1,$2,$3,$4,\'ACTIVE\',now(),now()) ON CONFLICT ("organizationId","userId") DO UPDATE SET "roleId"=EXCLUDED."roleId","status"=\'ACTIVE\',"updatedAt"=now()',
    [membershipId, orgId, user.rows[0].id, role.rows[0].id],
  )
  await client.query(
    'INSERT INTO "inbox_inboxes" ("id","organizationId","name","updatedAt") VALUES ($1,$2,$3,now()) ON CONFLICT ("organizationId","name") DO NOTHING',
    [inboxId, orgId, 'Preview Simulator'],
  )
  const inbox = await client.query(
    'SELECT "id" FROM "inbox_inboxes" WHERE "organizationId"=$1 AND "name"=$2',
    [orgId, 'Preview Simulator'],
  )
  await client.query(
    'INSERT INTO "crm_contacts" ("id","organizationId","name","source","updatedAt") VALUES ($1,$2,$3,$4,now())',
    [contactId, orgId, 'Preview Contact', 'preview-smoke'],
  )
  await client.query(
    'INSERT INTO "inbox_channel_accounts" ("id","organizationId","inboxId","provider","displayName","externalAccountId") VALUES ($1,$2,$3,\'SIMULATOR\',$4,$5) ON CONFLICT ("organizationId","provider","externalAccountId") DO NOTHING',
    [
      randomUUID(),
      orgId,
      inbox.rows[0].id,
      'Preview Simulator',
      'preview-smoke',
    ],
  )
  await client.query(
    'INSERT INTO "inbox_conversations" ("id","organizationId","inboxId","contactId","updatedAt") VALUES ($1,$2,$3,$4,now())',
    [conversationId, orgId, inbox.rows[0].id, contactId],
  )
  await client.query('COMMIT')
  console.log(
    'Synthetic preview organization, actor, membership, simulator inbox, contact, and conversation are ready.',
  )
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  await client.end()
}
