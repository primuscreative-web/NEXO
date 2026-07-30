-- Enforce tenant ownership at the database boundary for all Inbox references.
ALTER TABLE "inbox_inboxes"
  ADD CONSTRAINT "inbox_inboxes_org_id_key" UNIQUE ("organizationId", "id");
ALTER TABLE "crm_contacts"
  ADD CONSTRAINT "crm_contacts_org_id_key" UNIQUE ("organizationId", "id");
ALTER TABLE "inbox_channel_accounts"
  ADD CONSTRAINT "inbox_channel_accounts_org_id_key" UNIQUE ("organizationId", "id");

ALTER TABLE "crm_contact_channels" DROP CONSTRAINT IF EXISTS "crm_contact_channels_contact_fk";
ALTER TABLE "inbox_conversations" DROP CONSTRAINT IF EXISTS "inbox_conversations_inbox_fk";
ALTER TABLE "inbox_conversations" DROP CONSTRAINT IF EXISTS "inbox_conversations_contact_fk";
ALTER TABLE "inbox_messages" DROP CONSTRAINT IF EXISTS "inbox_messages_conversation_fk";
ALTER TABLE "inbox_internal_notes" DROP CONSTRAINT IF EXISTS "inbox_notes_conversation_fk";
ALTER TABLE "inbox_channel_accounts" DROP CONSTRAINT IF EXISTS "inbox_channel_accounts_inbox_fk";

ALTER TABLE "crm_contact_channels"
  ADD CONSTRAINT "crm_contact_channels_contact_tenant_fk"
  FOREIGN KEY ("organizationId", "contactId") REFERENCES "crm_contacts"("organizationId", "id") ON DELETE CASCADE;
ALTER TABLE "inbox_conversations"
  ADD CONSTRAINT "inbox_conversations_inbox_tenant_fk"
  FOREIGN KEY ("organizationId", "inboxId") REFERENCES "inbox_inboxes"("organizationId", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "inbox_conversations_contact_tenant_fk"
  FOREIGN KEY ("organizationId", "contactId") REFERENCES "crm_contacts"("organizationId", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "inbox_conversations_assignee_tenant_fk"
  FOREIGN KEY ("organizationId", "assigneeMembershipId") REFERENCES "organization_memberships"("organizationId", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "inbox_conversations_team_tenant_fk"
  FOREIGN KEY ("organizationId", "teamId") REFERENCES "organization_teams"("organizationId", "id") ON DELETE RESTRICT;
ALTER TABLE "inbox_messages"
  ADD CONSTRAINT "inbox_messages_conversation_tenant_fk"
  FOREIGN KEY ("organizationId", "conversationId") REFERENCES "inbox_conversations"("organizationId", "id") ON DELETE CASCADE;
ALTER TABLE "inbox_internal_notes"
  ADD CONSTRAINT "inbox_notes_conversation_tenant_fk"
  FOREIGN KEY ("organizationId", "conversationId") REFERENCES "inbox_conversations"("organizationId", "id") ON DELETE CASCADE,
  ADD CONSTRAINT "inbox_notes_author_tenant_fk"
  FOREIGN KEY ("organizationId", "authorMembershipId") REFERENCES "organization_memberships"("organizationId", "id") ON DELETE RESTRICT;
ALTER TABLE "inbox_channel_accounts"
  ADD CONSTRAINT "inbox_channel_accounts_inbox_tenant_fk"
  FOREIGN KEY ("organizationId", "inboxId") REFERENCES "inbox_inboxes"("organizationId", "id") ON DELETE CASCADE;
ALTER TABLE "inbox_channel_events"
  ADD CONSTRAINT "inbox_channel_events_account_tenant_fk"
  FOREIGN KEY ("organizationId", "channelAccountId") REFERENCES "inbox_channel_accounts"("organizationId", "id") ON DELETE CASCADE;
