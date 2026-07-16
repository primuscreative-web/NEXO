-- Identity audit entries have no tenant context. The table remains append-only and
-- tenant-owned entries still require the transaction-local organization context.
DROP POLICY audit_insert ON "platform_audit_logs";
CREATE POLICY audit_insert ON "platform_audit_logs" FOR INSERT
  WITH CHECK (
    "organizationId" = (SELECT nexo_private.current_organization_id())
    OR "organizationId" IS NULL
  );
