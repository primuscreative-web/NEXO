ALTER TABLE "inbox_tags"
  ADD CONSTRAINT "inbox_tags_org_id_key" UNIQUE ("organizationId", "id");

CREATE TABLE "inbox_conversation_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL,
  "conversationId" uuid NOT NULL,
  "tagId" uuid NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "conversationId", "tagId"),
  FOREIGN KEY ("organizationId", "conversationId") REFERENCES "inbox_conversations"("organizationId", "id") ON DELETE CASCADE,
  FOREIGN KEY ("organizationId", "tagId") REFERENCES "inbox_tags"("organizationId", "id") ON DELETE CASCADE
);
CREATE INDEX "inbox_conversation_tags_conversation" ON "inbox_conversation_tags" ("organizationId", "conversationId");
CREATE INDEX "inbox_conversation_tags_tag" ON "inbox_conversation_tags" ("organizationId", "tagId");
ALTER TABLE "inbox_conversation_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inbox_conversation_tags" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "inbox_conversation_tags"
  USING ("organizationId" = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true)::uuid);
