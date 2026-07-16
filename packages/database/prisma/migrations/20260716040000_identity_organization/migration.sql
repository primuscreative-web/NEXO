-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RefreshTokenStatus" AS ENUM ('ACTIVE', 'ROTATED', 'REVOKED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'DEAD');

-- CreateTable
CREATE TABLE "identity_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "normalizedEmail" VARCHAR(320) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" VARCHAR(16) NOT NULL DEFAULT 'pt-BR',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "identity_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_user_credentials" (
    "userId" UUID NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordChangedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "identity_user_credentials_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "identity_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "activeOrganizationId" UUID,
    "familyId" UUID NOT NULL,
    "csrfTokenHash" CHAR(64) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "ipAddress" INET,
    "userAgent" VARCHAR(512),
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "revokeReason" VARCHAR(128),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "identity_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_refresh_tokens" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "status" "RefreshTokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "replacedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_password_reset_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_email_verification_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "legalName" VARCHAR(200),
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" VARCHAR(16) NOT NULL DEFAULT 'pt-BR',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organization_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "invitedBy" UUID,
    "invitedAt" TIMESTAMPTZ(3),
    "acceptedAt" TIMESTAMPTZ(3),
    "suspendedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_invitations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "normalizedEmail" VARCHAR(320) NOT NULL,
    "roleId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedBy" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_teams" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "normalizedName" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "leaderMembershipId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organization_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_team_memberships" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_team_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_roles" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300),
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organization_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_permissions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_role_permissions" (
    "organizationId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_role_permissions_pkey" PRIMARY KEY ("organizationId","roleId","permissionId")
);

-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "actorUserId" UUID,
    "actorMembershipId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "resourceType" VARCHAR(80) NOT NULL,
    "resourceId" UUID,
    "ipAddress" INET,
    "userAgent" VARCHAR(512),
    "correlationId" UUID NOT NULL,
    "traceId" VARCHAR(64),
    "metadata" JSONB,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_outbox_events" (
    "id" UUID NOT NULL,
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "organizationId" UUID,
    "eventType" VARCHAR(160) NOT NULL,
    "eventVersion" INTEGER NOT NULL,
    "aggregateId" UUID,
    "aggregateVersion" INTEGER,
    "source" VARCHAR(100) NOT NULL,
    "correlationId" UUID NOT NULL,
    "causationId" UUID,
    "actorId" UUID,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leasedUntil" TIMESTAMPTZ(3),
    "publishedAt" TIMESTAMPTZ(3),
    "lastError" VARCHAR(500),
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identity_users_normalizedEmail_key" ON "identity_users"("normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "identity_sessions_familyId_key" ON "identity_sessions"("familyId");

-- CreateIndex
CREATE INDEX "identity_sessions_userId_status_createdAt_idx" ON "identity_sessions"("userId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "identity_sessions_activeOrganizationId_idx" ON "identity_sessions"("activeOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "identity_refresh_tokens_tokenHash_key" ON "identity_refresh_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "identity_refresh_tokens_replacedById_key" ON "identity_refresh_tokens"("replacedById");

-- CreateIndex
CREATE INDEX "identity_refresh_tokens_sessionId_status_idx" ON "identity_refresh_tokens"("sessionId", "status");

-- CreateIndex
CREATE INDEX "identity_refresh_tokens_expiresAt_idx" ON "identity_refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "identity_password_reset_tokens_tokenHash_key" ON "identity_password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "identity_password_reset_tokens_userId_expiresAt_idx" ON "identity_password_reset_tokens"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "identity_email_verification_tokens_tokenHash_key" ON "identity_email_verification_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "identity_email_verification_tokens_userId_expiresAt_idx" ON "identity_email_verification_tokens"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "organization_organizations_slug_key" ON "organization_organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_memberships_userId_status_idx" ON "organization_memberships"("userId", "status");

-- CreateIndex
CREATE INDEX "organization_memberships_organizationId_status_createdAt_idx" ON "organization_memberships"("organizationId", "status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organizationId_userId_key" ON "organization_memberships"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organizationId_id_key" ON "organization_memberships"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_invitations_tokenHash_key" ON "organization_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "organization_invitations_organizationId_status_createdAt_idx" ON "organization_invitations"("organizationId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "organization_invitations_normalizedEmail_status_idx" ON "organization_invitations"("normalizedEmail", "status");

-- CreateIndex
CREATE INDEX "organization_teams_organizationId_status_createdAt_idx" ON "organization_teams"("organizationId", "status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "organization_teams_organizationId_normalizedName_key" ON "organization_teams"("organizationId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "organization_teams_organizationId_id_key" ON "organization_teams"("organizationId", "id");

-- CreateIndex
CREATE INDEX "organization_team_memberships_organizationId_membershipId_idx" ON "organization_team_memberships"("organizationId", "membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_team_memberships_organizationId_teamId_members_key" ON "organization_team_memberships"("organizationId", "teamId", "membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_roles_organizationId_key_key" ON "organization_roles"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "organization_roles_organizationId_id_key" ON "organization_roles"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_permissions_key_key" ON "organization_permissions"("key");

-- CreateIndex
CREATE INDEX "organization_role_permissions_permissionId_idx" ON "organization_role_permissions"("permissionId");

-- CreateIndex
CREATE INDEX "platform_audit_logs_organizationId_createdAt_idx" ON "platform_audit_logs"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "platform_audit_logs_actorUserId_createdAt_idx" ON "platform_audit_logs"("actorUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "platform_audit_logs_action_createdAt_idx" ON "platform_audit_logs"("action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "platform_outbox_events_status_nextAttemptAt_createdAt_idx" ON "platform_outbox_events"("status", "nextAttemptAt", "createdAt");

-- CreateIndex
CREATE INDEX "platform_outbox_events_organizationId_createdAt_idx" ON "platform_outbox_events"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "platform_outbox_events_idempotencyKey_key" ON "platform_outbox_events"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "platform_outbox_events_eventType_aggregateId_aggregateVersi_key" ON "platform_outbox_events"("eventType", "aggregateId", "aggregateVersion");

-- AddForeignKey
ALTER TABLE "identity_user_credentials" ADD CONSTRAINT "identity_user_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_sessions" ADD CONSTRAINT "identity_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_sessions" ADD CONSTRAINT "identity_sessions_activeOrganizationId_fkey" FOREIGN KEY ("activeOrganizationId") REFERENCES "organization_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_refresh_tokens" ADD CONSTRAINT "identity_refresh_tokens_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "identity_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_password_reset_tokens" ADD CONSTRAINT "identity_password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_email_verification_tokens" ADD CONSTRAINT "identity_email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_roleId_fkey" FOREIGN KEY ("organizationId", "roleId") REFERENCES "organization_roles"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organizationId_roleId_fkey" FOREIGN KEY ("organizationId", "roleId") REFERENCES "organization_roles"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "identity_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_teams" ADD CONSTRAINT "organization_teams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_teams" ADD CONSTRAINT "organization_teams_organizationId_leaderMembershipId_fkey" FOREIGN KEY ("organizationId", "leaderMembershipId") REFERENCES "organization_memberships"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_team_memberships" ADD CONSTRAINT "organization_team_memberships_organizationId_teamId_fkey" FOREIGN KEY ("organizationId", "teamId") REFERENCES "organization_teams"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_team_memberships" ADD CONSTRAINT "organization_team_memberships_organizationId_membershipId_fkey" FOREIGN KEY ("organizationId", "membershipId") REFERENCES "organization_memberships"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_roles" ADD CONSTRAINT "organization_roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_role_permissions" ADD CONSTRAINT "organization_role_permissions_organizationId_roleId_fkey" FOREIGN KEY ("organizationId", "roleId") REFERENCES "organization_roles"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_role_permissions" ADD CONSTRAINT "organization_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "organization_permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "identity_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_organizationId_actorMembershipId_fkey" FOREIGN KEY ("organizationId", "actorMembershipId") REFERENCES "organization_memberships"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_outbox_events" ADD CONSTRAINT "platform_outbox_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 1 tenant isolation: transaction-local settings are populated by scoped repositories.
CREATE SCHEMA IF NOT EXISTS nexo_private;

CREATE OR REPLACE FUNCTION nexo_private.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION nexo_private.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$;

REVOKE ALL ON SCHEMA nexo_private FROM PUBLIC;

ALTER TABLE "organization_organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_organizations" FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_tenant_all ON "organization_organizations"
  USING ("id" = (SELECT nexo_private.current_organization_id()))
  WITH CHECK ("id" = (SELECT nexo_private.current_organization_id()));

ALTER TABLE "organization_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_memberships" FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_select ON "organization_memberships" FOR SELECT
  USING (
    "organizationId" = (SELECT nexo_private.current_organization_id())
    OR "userId" = (SELECT nexo_private.current_user_id())
  );
CREATE POLICY membership_write ON "organization_memberships" FOR ALL
  USING ("organizationId" = (SELECT nexo_private.current_organization_id()))
  WITH CHECK ("organizationId" = (SELECT nexo_private.current_organization_id()));

ALTER TABLE "organization_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_invitations" FORCE ROW LEVEL SECURITY;
CREATE POLICY invitation_tenant_all ON "organization_invitations"
  USING ("organizationId" = (SELECT nexo_private.current_organization_id()))
  WITH CHECK ("organizationId" = (SELECT nexo_private.current_organization_id()));

ALTER TABLE "organization_teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_teams" FORCE ROW LEVEL SECURITY;
CREATE POLICY team_tenant_all ON "organization_teams"
  USING ("organizationId" = (SELECT nexo_private.current_organization_id()))
  WITH CHECK ("organizationId" = (SELECT nexo_private.current_organization_id()));

ALTER TABLE "organization_team_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_team_memberships" FORCE ROW LEVEL SECURITY;
CREATE POLICY team_membership_tenant_all ON "organization_team_memberships"
  USING ("organizationId" = (SELECT nexo_private.current_organization_id()))
  WITH CHECK ("organizationId" = (SELECT nexo_private.current_organization_id()));

ALTER TABLE "organization_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY role_tenant_all ON "organization_roles"
  USING ("organizationId" = (SELECT nexo_private.current_organization_id()))
  WITH CHECK ("organizationId" = (SELECT nexo_private.current_organization_id()));

ALTER TABLE "organization_role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_role_permissions" FORCE ROW LEVEL SECURITY;
CREATE POLICY role_permission_tenant_all ON "organization_role_permissions"
  USING ("organizationId" = (SELECT nexo_private.current_organization_id()))
  WITH CHECK ("organizationId" = (SELECT nexo_private.current_organization_id()));

ALTER TABLE "platform_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_select ON "platform_audit_logs" FOR SELECT
  USING (
    "organizationId" = (SELECT nexo_private.current_organization_id())
    OR (
      "organizationId" IS NULL
      AND "actorUserId" = (SELECT nexo_private.current_user_id())
    )
  );
CREATE POLICY audit_insert ON "platform_audit_logs" FOR INSERT
  WITH CHECK (
    "organizationId" = (SELECT nexo_private.current_organization_id())
    OR (
      "organizationId" IS NULL
      AND "actorUserId" = (SELECT nexo_private.current_user_id())
    )
  );

CREATE OR REPLACE FUNCTION nexo_private.reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'audit logs are append-only';
END;
$$;

CREATE TRIGGER platform_audit_logs_append_only
BEFORE UPDATE OR DELETE ON "platform_audit_logs"
FOR EACH ROW EXECUTE FUNCTION nexo_private.reject_audit_mutation();

CREATE UNIQUE INDEX organization_invitations_pending_email_key
ON "organization_invitations" ("organizationId", "normalizedEmail")
WHERE "status" = 'PENDING';

CREATE INDEX identity_user_credentials_locked_until_idx
ON "identity_user_credentials" ("lockedUntil")
WHERE "lockedUntil" IS NOT NULL;
