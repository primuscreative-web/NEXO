CREATE TABLE "inbox_conversation_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL,
  "conversationId" uuid NOT NULL,
  "tagId" uuid NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "conversationId", "tagId"),
  FOREIGN KEY ("conversationId") REFERENCES "inbox_conversations"("id") ON DELETE CASCADE,
  FOREIGN KEY ("tagId") REFERENCES "inbox_tags"("id") ON DELETE CASCADE
);
CREATE INDEX "inbox_conversation_tags_conversation" ON "inbox_conversation_tags" ("organizationId", "conversationId");
CREATE INDEX "inbox_conversation_tags_tag" ON "inbox_conversation_tags" ("organizationId", "tagId");
ALTER TABLE "inbox_conversation_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inbox_conversation_tags" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "inbox_conversation_tags"
  USING ("organizationId" = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true)::uuid);
