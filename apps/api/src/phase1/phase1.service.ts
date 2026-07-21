import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import {
  Argon2idPasswordHasher,
  JwtAccessTokenService,
  generateOpaqueToken,
  hashOpaqueToken,
} from '@nexo/auth'
import {
  createDatabaseClient,
  type DatabaseClient,
  type DatabaseTransaction,
  withTenant,
  withUser,
} from '@nexo/database'
import {
  assessPassword,
  assertRefreshCanRotate,
  assertUserCanAuthenticate,
  nextLockout,
  normalizeEmail,
} from '@nexo/identity'
import { InMemoryEmailDeliveryAdapter } from '@nexo/notification'
import {
  assertAuthorized,
  assertMembershipTransition,
  assertOwnerMutation,
  normalizeSlug,
  permissionKeys,
  rolePermissions,
  type PermissionKey,
  type SystemRoleKey,
} from '@nexo/organization'
import { sanitizeAuditMetadata, type AuditAction } from '@nexo/platform'
import { exportPKCS8, exportSPKI, generateKeyPair } from 'jose'

export interface RequestContext {
  readonly correlationId: string
  readonly causationId?: string
  readonly traceId?: string
  readonly ipAddress?: string
  readonly userAgent?: string
}

export interface AuthResult {
  readonly accessToken: string
  readonly refreshToken: string
  readonly csrfToken: string
  readonly sessionId: string
  readonly user: { id: string; email: string; name: string }
}

export interface AuthPrincipal {
  readonly userId: string
  readonly sessionId: string
  readonly organizationId?: string
}

export class Phase1Error extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'Phase1Error'
  }
}

const roleNames: Readonly<Record<SystemRoleKey, string>> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  agent: 'Agente',
  analyst: 'Analista',
  developer: 'Desenvolvedor',
  finance: 'Financeiro',
}

const dummyPasswordHash =
  '$argon2id$v=19$m=19456,t=2,p=1$I1bT0YUdfnI4o3CKhvBQfQ$wxlLgHka8NX+XpjYRflDF1KlaiZIfiVcTP1FoxqwH0c'

@Injectable()
export class Phase1Service implements OnModuleInit, OnModuleDestroy {
  readonly emails = new InMemoryEmailDeliveryAdapter()
  readonly #passwordHasher = new Argon2idPasswordHasher()
  #database: DatabaseClient | null = null
  #databaseUrl: string | null = null
  #tokens: JwtAccessTokenService | null = null

  async onModuleInit(): Promise<void> {
    if (process.env.CI) process.stderr.write('[phase1] initializing adapters\n')
    this.#databaseUrl = process.env.DATABASE_URL ?? null

    let privateKeyPem = process.env.AUTH_JWT_PRIVATE_KEY?.replaceAll(
      '\\n',
      '\n',
    )
    let publicKeyPem = process.env.AUTH_JWT_PUBLIC_KEY?.replaceAll('\\n', '\n')
    if (!privateKeyPem || !publicKeyPem) {
      if (process.env.NODE_ENV === 'production')
        throw new Error('JWT signing keys are required in production')
      const pair = await generateKeyPair('EdDSA', {
        crv: 'Ed25519',
        extractable: true,
      })
      privateKeyPem = await exportPKCS8(pair.privateKey)
      publicKeyPem = await exportSPKI(pair.publicKey)
    }
    this.#tokens = new JwtAccessTokenService({
      privateKeyPem,
      publicKeyPem,
      issuer: process.env.AUTH_JWT_ISSUER ?? 'nexo',
      audience: process.env.AUTH_JWT_AUDIENCE ?? 'nexo-api',
      expiresInSeconds: 900,
    })
    if (process.env.CI) process.stderr.write('[phase1] adapters initialized\n')
  }

  async onModuleDestroy(): Promise<void> {
    await this.#database?.$disconnect()
  }

  async verifyAccessToken(token: string): Promise<AuthPrincipal> {
    const claims = await this.#tokenService().verify(token)
    const session = await this.#db().session.findFirst({
      where: {
        id: claims.sid,
        userId: claims.sub,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
        user: { status: 'ACTIVE' },
      },
      select: { id: true, userId: true, activeOrganizationId: true },
    })
    if (!session) throw new Phase1Error('unauthorized', 401, 'Unauthorized')
    if ((claims.org ?? null) !== session.activeOrganizationId)
      throw new Phase1Error('stale_access_token', 401, 'Unauthorized')
    return {
      userId: session.userId,
      sessionId: session.id,
      ...(session.activeOrganizationId
        ? { organizationId: session.activeOrganizationId }
        : {}),
    }
  }

  async register(
    input: { email: string; name: string; password: string },
    context: RequestContext,
  ): Promise<{ userId: string; verificationToken?: string }> {
    const assessment = assessPassword(input.password)
    if (!assessment.valid)
      throw new Phase1Error('weak_password', 422, assessment.errors.join(','))
    const normalizedEmail = normalizeEmail(input.email)
    const passwordHash = await this.#passwordHasher.hash(input.password)
    const verificationToken = generateOpaqueToken()
    const verificationHash = hashOpaqueToken(verificationToken)
    const userId = randomUUID()

    try {
      await this.#db().$transaction(async (transaction) => {
        await transaction.user.create({
          data: {
            id: userId,
            email: input.email.trim(),
            normalizedEmail,
            name: input.name.trim(),
            credential: { create: { passwordHash } },
            emailVerificationTokens: {
              create: {
                tokenHash: verificationHash,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            },
          },
        })
        await this.#audit(transaction, context, {
          action: 'user.registered',
          actorUserId: userId,
          resourceType: 'User',
          resourceId: userId,
        })
        await this.#outbox(transaction, context, {
          eventType: 'UserRegistered',
          actorId: userId,
          payload: { userId },
        })
      })
    } catch (error) {
      if (this.#isUniqueViolation(error)) return { userId }
      throw error
    }

    await this.emails.send({
      to: normalizedEmail,
      template: 'verify-email',
      parameters: { token: verificationToken },
      idempotencyKey: `verify:${userId}`,
    })
    return {
      userId,
      ...(process.env.NODE_ENV === 'test' ? { verificationToken } : {}),
    }
  }

  async login(
    input: { email: string; password: string },
    context: RequestContext,
  ): Promise<AuthResult> {
    const user = await this.#db().user.findUnique({
      where: { normalizedEmail: normalizeEmail(input.email) },
      include: { credential: true },
    })
    const passwordMatches = user?.credential
      ? await this.#passwordHasher.verify(
          user.credential.passwordHash,
          input.password,
        )
      : await this.#passwordHasher.verify(dummyPasswordHash, input.password)

    if (!user?.credential || !passwordMatches) {
      if (user?.credential) {
        const failedAttempts = user.credential.failedAttempts + 1
        await this.#db().userCredential.update({
          where: { userId: user.id },
          data: {
            failedAttempts,
            lockedUntil: nextLockout(failedAttempts),
          },
        })
      }
      await this.#audit(this.#db(), context, {
        action: 'auth.login.failed',
        resourceType: 'User',
        metadata: {
          emailFingerprint: hashOpaqueToken(normalizeEmail(input.email)),
        },
      })
      throw new Phase1Error('invalid_credentials', 401, 'Invalid credentials')
    }

    if (!user.emailVerifiedAt)
      throw new Phase1Error(
        'email_not_verified',
        403,
        'Confirm your email before signing in',
      )

    assertUserCanAuthenticate({
      status: user.status,
      lockedUntil: user.credential.lockedUntil,
    })
    const refreshToken = generateOpaqueToken()
    const csrfToken = generateOpaqueToken()
    const sessionId = randomUUID()
    const familyId = randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await this.#db().$transaction(async (transaction) => {
      await transaction.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          familyId,
          csrfTokenHash: hashOpaqueToken(csrfToken),
          expiresAt,
          ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
          ...(context.userAgent ? { userAgent: context.userAgent } : {}),
          refreshTokens: {
            create: {
              tokenHash: hashOpaqueToken(refreshToken),
              expiresAt,
            },
          },
        },
      })
      await transaction.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      await transaction.userCredential.update({
        where: { userId: user.id },
        data: { failedAttempts: 0, lockedUntil: null },
      })
      await this.#audit(transaction, context, {
        action: 'auth.login.succeeded',
        actorUserId: user.id,
        resourceType: 'Session',
        resourceId: sessionId,
      })
    })

    return {
      accessToken: await this.#tokenService().sign({
        userId: user.id,
        sessionId,
      }),
      refreshToken,
      csrfToken,
      sessionId,
      user: { id: user.id, email: user.email, name: user.name },
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashOpaqueToken(token)
    const verification = await this.#db().emailVerificationToken.findUnique({
      where: { tokenHash },
    })
    if (
      !verification ||
      verification.usedAt ||
      verification.expiresAt <= new Date()
    )
      throw new Phase1Error(
        'invalid_verification',
        400,
        'Invalid or expired token',
      )
    await this.#db().$transaction(async (transaction) => {
      const claimed = await transaction.emailVerificationToken.updateMany({
        where: { id: verification.id, usedAt: null },
        data: { usedAt: new Date() },
      })
      if (claimed.count !== 1)
        throw new Phase1Error(
          'invalid_verification',
          400,
          'Invalid or expired token',
        )
      await transaction.user.update({
        where: { id: verification.userId },
        data: { emailVerifiedAt: new Date() },
      })
    })
  }

  async refresh(
    refreshToken: string,
    csrfToken: string,
    context: RequestContext,
  ): Promise<AuthResult> {
    const token = await this.#db().refreshToken.findUnique({
      where: { tokenHash: hashOpaqueToken(refreshToken) },
      include: { session: { include: { user: true } } },
    })
    if (!token) throw new Phase1Error('invalid_refresh', 401, 'Unauthorized')

    try {
      assertRefreshCanRotate({
        sessionStatus: token.session.status,
        sessionExpiresAt: token.session.expiresAt,
        tokenStatus: token.status,
        tokenExpiresAt: token.expiresAt,
      })
      if (token.session.csrfTokenHash !== hashOpaqueToken(csrfToken))
        throw new Phase1Error('invalid_csrf', 403, 'Forbidden')
    } catch (error) {
      await this.#db().session.update({
        where: { id: token.sessionId },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokeReason: 'refresh_reuse_or_rejection',
          refreshTokens: {
            updateMany: {
              where: { status: 'ACTIVE' },
              data: { status: 'REVOKED', revokedAt: new Date() },
            },
          },
        },
      })
      await this.#audit(this.#db(), context, {
        action: 'auth.refresh.rejected',
        actorUserId: token.session.userId,
        resourceType: 'Session',
        resourceId: token.sessionId,
      })
      if (error instanceof Phase1Error) throw error
      throw new Phase1Error('invalid_refresh', 401, 'Unauthorized')
    }

    const nextRefreshToken = generateOpaqueToken()
    const nextId = randomUUID()
    try {
      await this.#db().$transaction(async (transaction) => {
        const rotated = await transaction.refreshToken.updateMany({
          where: { id: token.id, status: 'ACTIVE' },
          data: {
            status: 'ROTATED',
            usedAt: new Date(),
            replacedById: nextId,
          },
        })
        if (rotated.count !== 1)
          throw new Phase1Error('refresh_reused', 401, 'Unauthorized')
        await transaction.refreshToken.create({
          data: {
            id: nextId,
            sessionId: token.sessionId,
            tokenHash: hashOpaqueToken(nextRefreshToken),
            expiresAt: token.expiresAt,
          },
        })
        await transaction.session.update({
          where: { id: token.sessionId },
          data: { lastSeenAt: new Date() },
        })
      })
    } catch (error) {
      if (error instanceof Phase1Error && error.code === 'refresh_reused') {
        await this.#revokeSessionFamily(
          token.sessionId,
          'refresh_reuse_detected',
        )
      }
      throw error
    }

    return {
      accessToken: await this.#tokenService().sign({
        userId: token.session.userId,
        sessionId: token.sessionId,
        ...(token.session.activeOrganizationId
          ? { organizationId: token.session.activeOrganizationId }
          : {}),
      }),
      refreshToken: nextRefreshToken,
      csrfToken,
      sessionId: token.sessionId,
      user: {
        id: token.session.user.id,
        email: token.session.user.email,
        name: token.session.user.name,
      },
    }
  }

  async logout(
    principal: AuthPrincipal,
    context: RequestContext,
  ): Promise<void> {
    await this.#revokeSession(principal.userId, principal.sessionId, 'logout')
    await this.#audit(this.#db(), context, {
      action: 'auth.logout',
      actorUserId: principal.userId,
      resourceType: 'Session',
      resourceId: principal.sessionId,
    })
  }

  async forgotPassword(
    email: string,
  ): Promise<{ resetToken?: string; accepted: true }> {
    const user = await this.#db().user.findUnique({
      where: { normalizedEmail: normalizeEmail(email) },
      select: { id: true, normalizedEmail: true, status: true },
    })
    if (user?.status !== 'ACTIVE') return { accepted: true }
    const resetToken = generateOpaqueToken()
    await this.#db().passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashOpaqueToken(resetToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })
    await this.emails.send({
      to: user.normalizedEmail,
      template: 'reset-password',
      parameters: { token: resetToken },
      idempotencyKey: `reset:${user.id}:${hashOpaqueToken(resetToken)}`,
    })
    return {
      accepted: true,
      ...(process.env.NODE_ENV === 'test' ? { resetToken } : {}),
    }
  }

  async resetPassword(
    tokenValue: string,
    password: string,
    context: RequestContext,
  ): Promise<void> {
    if (!assessPassword(password).valid)
      throw new Phase1Error('weak_password', 422, 'Weak password')
    const token = await this.#db().passwordResetToken.findUnique({
      where: { tokenHash: hashOpaqueToken(tokenValue) },
    })
    if (!token || token.usedAt || token.expiresAt <= new Date())
      throw new Phase1Error(
        'invalid_reset_token',
        400,
        'Invalid or expired token',
      )
    const passwordHash = await this.#passwordHasher.hash(password)
    await this.#db().$transaction(async (transaction) => {
      await transaction.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      })
      await transaction.userCredential.update({
        where: { userId: token.userId },
        data: { passwordHash, passwordChangedAt: new Date() },
      })
      await transaction.session.updateMany({
        where: { userId: token.userId, status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokeReason: 'password_reset',
        },
      })
      await transaction.refreshToken.updateMany({
        where: { session: { userId: token.userId }, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      })
      await this.#audit(transaction, context, {
        action: 'auth.password.reset',
        actorUserId: token.userId,
        resourceType: 'User',
        resourceId: token.userId,
      })
      await this.#outbox(transaction, context, {
        eventType: 'UserPasswordChanged',
        actorId: token.userId,
        aggregateId: token.userId,
        payload: { userId: token.userId, reason: 'password_reset' },
      })
    })
  }

  async changePassword(
    principal: AuthPrincipal,
    currentPassword: string,
    nextPassword: string,
    context: RequestContext,
  ): Promise<void> {
    if (!assessPassword(nextPassword).valid)
      throw new Phase1Error('weak_password', 422, 'Weak password')
    const credential = await this.#db().userCredential.findUnique({
      where: { userId: principal.userId },
    })
    if (
      !credential ||
      !(await this.#passwordHasher.verify(
        credential.passwordHash,
        currentPassword,
      ))
    )
      throw new Phase1Error('invalid_credentials', 401, 'Invalid credentials')
    const passwordHash = await this.#passwordHasher.hash(nextPassword)
    await this.#db().$transaction(async (transaction) => {
      await transaction.userCredential.update({
        where: { userId: principal.userId },
        data: { passwordHash, passwordChangedAt: new Date() },
      })
      await transaction.session.updateMany({
        where: {
          userId: principal.userId,
          id: { not: principal.sessionId },
          status: 'ACTIVE',
        },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokeReason: 'password_changed',
        },
      })
      await transaction.refreshToken.updateMany({
        where: {
          session: {
            userId: principal.userId,
            id: { not: principal.sessionId },
          },
          status: 'ACTIVE',
        },
        data: { status: 'REVOKED', revokedAt: new Date() },
      })
      await this.#audit(transaction, context, {
        action: 'auth.password.changed',
        actorUserId: principal.userId,
        resourceType: 'User',
        resourceId: principal.userId,
      })
      await this.#outbox(transaction, context, {
        eventType: 'UserPasswordChanged',
        actorId: principal.userId,
        aggregateId: principal.userId,
        payload: { userId: principal.userId, reason: 'password_changed' },
      })
    })
  }

  async listSessions(principal: AuthPrincipal) {
    const items = await this.#db().session.findMany({
      where: { userId: principal.userId },
      orderBy: { createdAt: 'desc' },
      take: 101,
      select: {
        id: true,
        status: true,
        activeOrganizationId: true,
        ipAddress: true,
        userAgent: true,
        lastSeenAt: true,
        expiresAt: true,
        createdAt: true,
      },
    })
    return this.#page(items, 100)
  }

  async revokeSession(
    principal: AuthPrincipal,
    sessionId: string,
    context: RequestContext,
  ): Promise<void> {
    await this.#revokeSession(principal.userId, sessionId, 'user_revoked')
    await this.#audit(this.#db(), context, {
      action: 'session.revoked',
      actorUserId: principal.userId,
      resourceType: 'Session',
      resourceId: sessionId,
    })
  }

  async revokeOtherSessions(principal: AuthPrincipal): Promise<number> {
    return this.#db().$transaction(async (transaction) => {
      const sessions = await transaction.session.findMany({
        where: {
          userId: principal.userId,
          id: { not: principal.sessionId },
          status: 'ACTIVE',
        },
        select: { id: true },
      })
      const ids = sessions.map(({ id }) => id)
      if (ids.length === 0) return 0
      await transaction.refreshToken.updateMany({
        where: { sessionId: { in: ids }, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      })
      const result = await transaction.session.updateMany({
        where: { id: { in: ids }, status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokeReason: 'revoke_others',
        },
      })
      return result.count
    })
  }

  async me(principal: AuthPrincipal) {
    const user = await this.#db().user.findUniqueOrThrow({
      where: { id: principal.userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        locale: true,
        timezone: true,
        emailVerifiedAt: true,
      },
    })
    return { ...user, activeOrganizationId: principal.organizationId ?? null }
  }

  async createOrganization(
    principal: AuthPrincipal,
    input: { name: string; slug?: string; legalName?: string },
    context: RequestContext,
  ) {
    const organizationId = randomUUID()
    const requestedSlug = input.slug?.trim()
    const slug = normalizeSlug(
      requestedSlug?.length ? requestedSlug : input.name,
    )
    return withTenant(
      this.#db(),
      { userId: principal.userId, organizationId },
      async (transaction) => {
        const organization = await transaction.organization.create({
          data: {
            id: organizationId,
            name: input.name.trim(),
            slug,
            ...(input.legalName ? { legalName: input.legalName.trim() } : {}),
          },
        })
        await transaction.permission.createMany({
          data: permissionKeys.map((key) => ({
            key,
            description: key,
          })),
          skipDuplicates: true,
        })
        const permissions = await transaction.permission.findMany()
        const roles = new Map<SystemRoleKey, string>()
        for (const roleKey of Object.keys(rolePermissions) as SystemRoleKey[]) {
          const roleId = randomUUID()
          roles.set(roleKey, roleId)
          await transaction.role.create({
            data: {
              id: roleId,
              organizationId,
              key: roleKey,
              name: roleNames[roleKey],
              isProtected: true,
              permissions: {
                create: permissions
                  .filter((permission) =>
                    rolePermissions[roleKey].has(
                      permission.key as PermissionKey,
                    ),
                  )
                  .map((permission) => ({ permissionId: permission.id })),
              },
            },
          })
        }
        const ownerRoleId = roles.get('owner')
        if (!ownerRoleId)
          throw new Phase1Error(
            'role_seed_failed',
            500,
            'Owner role unavailable',
          )
        await transaction.membership.create({
          data: {
            organizationId,
            userId: principal.userId,
            roleId: ownerRoleId,
            status: 'ACTIVE',
            acceptedAt: new Date(),
          },
        })
        await this.#audit(transaction, context, {
          action: 'organization.created',
          organizationId,
          actorUserId: principal.userId,
          resourceType: 'Organization',
          resourceId: organizationId,
        })
        await this.#outbox(transaction, context, {
          eventType: 'OrganizationCreated',
          organizationId,
          actorId: principal.userId,
          aggregateId: organizationId,
          aggregateVersion: 1,
          payload: { organizationId, slug },
        })
        return organization
      },
    )
  }

  async listOrganizations(principal: AuthPrincipal) {
    const memberships = await withUser(
      this.#db(),
      principal.userId,
      (transaction) =>
        transaction.membership.findMany({
          where: { userId: principal.userId, status: 'ACTIVE' },
          select: { organizationId: true, roleId: true },
        }),
    )
    return Promise.all(
      memberships.map((membership) =>
        withTenant(
          this.#db(),
          {
            userId: principal.userId,
            organizationId: membership.organizationId,
          },
          async (transaction) => {
            const role = await transaction.role.findUniqueOrThrow({
              where: {
                organizationId_id: {
                  organizationId: membership.organizationId,
                  id: membership.roleId,
                },
              },
              select: {
                key: true,
                name: true,
                permissions: {
                  select: { permission: { select: { key: true } } },
                },
              },
            })
            return {
              organization: await transaction.organization.findUniqueOrThrow({
                where: { id: membership.organizationId },
              }),
              role: {
                key: role.key,
                name: role.name,
                permissions: role.permissions.map(
                  ({ permission }) => permission.key,
                ),
              },
            }
          },
        ),
      ),
    )
  }

  async selectOrganization(
    principal: AuthPrincipal,
    organizationId: string,
  ): Promise<string> {
    await withTenant(
      this.#db(),
      { userId: principal.userId, organizationId },
      async (transaction) => {
        const membership = await transaction.membership.findUnique({
          where: {
            organizationId_userId: { organizationId, userId: principal.userId },
          },
          include: { organization: true },
        })
        if (
          membership?.status !== 'ACTIVE' ||
          membership.organization.status !== 'ACTIVE'
        )
          throw new Phase1Error('organization_unavailable', 403, 'Forbidden')
        await transaction.session.update({
          where: { id: principal.sessionId },
          data: { activeOrganizationId: organizationId },
        })
      },
    )
    return this.#tokenService().sign({
      userId: principal.userId,
      sessionId: principal.sessionId,
      organizationId,
    })
  }

  async getOrganization(principal: AuthPrincipal, organizationId: string) {
    return this.#authorized(
      principal,
      organizationId,
      'organization.read',
      (tx) =>
        tx.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    )
  }

  async updateOrganization(
    principal: AuthPrincipal,
    organizationId: string,
    input: {
      name?: string
      legalName?: string
      locale?: string
      timezone?: string
    },
    context: RequestContext,
  ) {
    return this.#authorized(
      principal,
      organizationId,
      'organization.update',
      async (transaction) => {
        const before = await transaction.organization.findUniqueOrThrow({
          where: { id: organizationId },
        })
        const organization = await transaction.organization.update({
          where: { id: organizationId },
          data: {
            ...(input.name ? { name: input.name.trim() } : {}),
            ...(input.legalName !== undefined
              ? { legalName: input.legalName.trim() || null }
              : {}),
            ...(input.locale ? { locale: input.locale } : {}),
            ...(input.timezone ? { timezone: input.timezone } : {}),
          },
        })
        await this.#audit(transaction, context, {
          action: 'organization.updated',
          organizationId,
          actorUserId: principal.userId,
          resourceType: 'Organization',
          resourceId: organizationId,
          before: { name: before.name, legalName: before.legalName },
          after: { name: organization.name, legalName: organization.legalName },
        })
        return organization
      },
    )
  }

  async listMemberships(
    principal: AuthPrincipal,
    organizationId: string,
    input: { cursor?: string; limit?: number } = {},
  ) {
    const limit = this.#limit(input.limit)
    return this.#authorized(
      principal,
      organizationId,
      'membership.read',
      (tx) =>
        tx.membership
          .findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
            include: {
              user: {
                select: { id: true, email: true, name: true, status: true },
              },
              role: { select: { id: true, key: true, name: true } },
            },
          })
          .then((items) => this.#page(items, limit)),
    )
  }

  async invite(
    principal: AuthPrincipal,
    organizationId: string,
    input: { email: string; roleId: string },
    context: RequestContext,
  ) {
    const secret = generateOpaqueToken()
    const invitationId = randomUUID()
    const token = `${organizationId}.${invitationId}.${secret}`
    const invitation = await this.#authorized(
      principal,
      organizationId,
      'membership.invite',
      async (transaction) => {
        const normalizedEmail = normalizeEmail(input.email)
        const existingUser = await transaction.user.findUnique({
          where: { normalizedEmail },
          select: { id: true },
        })
        if (existingUser) {
          const membership = await transaction.membership.findUnique({
            where: {
              organizationId_userId: {
                organizationId,
                userId: existingUser.id,
              },
            },
          })
          if (membership?.status === 'ACTIVE')
            throw new Phase1Error('already_member', 409, 'Already a member')
        }
        const created = await transaction.invitation.create({
          data: {
            id: invitationId,
            organizationId,
            normalizedEmail,
            roleId: input.roleId,
            tokenHash: hashOpaqueToken(token),
            invitedBy: principal.userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
        await this.#audit(transaction, context, {
          action: 'invitation.created',
          organizationId,
          actorUserId: principal.userId,
          resourceType: 'Invitation',
          resourceId: invitationId,
          metadata: { normalizedEmail },
        })
        await this.#outbox(transaction, context, {
          eventType: 'MembershipInvited',
          organizationId,
          actorId: principal.userId,
          aggregateId: invitationId,
          aggregateVersion: 1,
          payload: { invitationId, normalizedEmail },
        })
        return created
      },
    )
    await this.emails.send({
      to: invitation.normalizedEmail,
      template: 'organization-invitation',
      parameters: { token },
      idempotencyKey: `invitation:${invitation.id}:${invitation.resendCount}`,
    })
    return {
      ...invitation,
      ...(process.env.NODE_ENV === 'test' ? { token } : {}),
    }
  }

  async acceptInvitation(
    principal: AuthPrincipal,
    tokenValue: string,
    context: RequestContext,
  ) {
    const [organizationId, invitationId] = tokenValue.split('.')
    if (!organizationId || !invitationId)
      throw new Phase1Error('invalid_invitation', 400, 'Invalid invitation')
    return withTenant(
      this.#db(),
      { userId: principal.userId, organizationId },
      async (transaction) => {
        const invitation = await transaction.invitation.findFirst({
          where: {
            id: invitationId,
            organizationId,
            tokenHash: hashOpaqueToken(tokenValue),
          },
        })
        if (!invitation)
          throw new Phase1Error('invalid_invitation', 400, 'Invalid invitation')
        if (
          invitation.status !== 'PENDING' ||
          invitation.expiresAt <= new Date()
        )
          throw new Phase1Error('invalid_invitation', 400, 'Invalid invitation')
        const user = await transaction.user.findUniqueOrThrow({
          where: { id: principal.userId },
          select: { normalizedEmail: true },
        })
        if (user.normalizedEmail !== invitation.normalizedEmail)
          throw new Phase1Error('invitation_email_mismatch', 403, 'Forbidden')
        const claimed = await transaction.invitation.updateMany({
          where: {
            id: invitation.id,
            organizationId,
            status: 'PENDING',
            expiresAt: { gt: new Date() },
          },
          data: { status: 'ACCEPTED', acceptedAt: new Date() },
        })
        if (claimed.count !== 1)
          throw new Phase1Error('invalid_invitation', 400, 'Invalid invitation')
        const currentMembership = await transaction.membership.findUnique({
          where: {
            organizationId_userId: { organizationId, userId: principal.userId },
          },
        })
        if (
          currentMembership &&
          !['INVITED', 'ACTIVE'].includes(currentMembership.status)
        )
          throw new Phase1Error(
            'membership_inactive',
            409,
            'Membership is inactive',
          )
        const membership = currentMembership
          ? await transaction.membership.update({
              where: { id: currentMembership.id },
              data: {
                roleId: invitation.roleId,
                status: 'ACTIVE',
                acceptedAt: currentMembership.acceptedAt ?? new Date(),
              },
            })
          : await transaction.membership.create({
              data: {
                organizationId,
                userId: principal.userId,
                roleId: invitation.roleId,
                status: 'ACTIVE',
                invitedBy: invitation.invitedBy,
                invitedAt: invitation.createdAt,
                acceptedAt: new Date(),
              },
            })
        await this.#audit(transaction, context, {
          action: 'invitation.accepted',
          organizationId,
          actorUserId: principal.userId,
          resourceType: 'Invitation',
          resourceId: invitation.id,
        })
        await this.#outbox(transaction, context, {
          eventType: 'MembershipActivated',
          organizationId,
          actorId: principal.userId,
          aggregateId: membership.id,
          aggregateVersion: 1,
          payload: { membershipId: membership.id, userId: principal.userId },
        })
        return membership
      },
    )
  }

  async resendInvitation(
    principal: AuthPrincipal,
    invitationId: string,
    context: RequestContext,
  ) {
    const organizationId = this.#requireOrganization(principal)
    const secret = generateOpaqueToken()
    const token = `${organizationId}.${invitationId}.${secret}`
    const invitation = await this.#authorized(
      principal,
      organizationId,
      'membership.invite',
      async (transaction) => {
        const current = await transaction.invitation.findUniqueOrThrow({
          where: { id: invitationId },
        })
        if (current.status !== 'PENDING')
          throw new Phase1Error(
            'invitation_inactive',
            409,
            'Invitation is inactive',
          )
        if (current.resendCount >= 5)
          throw new Phase1Error('resend_limit', 429, 'Resend limit reached')
        const updated = await transaction.invitation.update({
          where: { id: invitationId },
          data: {
            tokenHash: hashOpaqueToken(token),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            resendCount: { increment: 1 },
            lastSentAt: new Date(),
          },
        })
        await this.#audit(transaction, context, {
          action: 'invitation.resent',
          organizationId,
          actorUserId: principal.userId,
          resourceType: 'Invitation',
          resourceId: invitationId,
        })
        return updated
      },
    )
    await this.emails.send({
      to: invitation.normalizedEmail,
      template: 'organization-invitation',
      parameters: { token },
      idempotencyKey: `invitation:${invitation.id}:${invitation.resendCount}`,
    })
    return {
      ...invitation,
      ...(process.env.NODE_ENV === 'test' ? { token } : {}),
    }
  }

  async revokeInvitation(
    principal: AuthPrincipal,
    invitationId: string,
    context: RequestContext,
  ): Promise<void> {
    const organizationId = this.#requireOrganization(principal)
    await this.#authorized(
      principal,
      organizationId,
      'membership.invite',
      async (transaction) => {
        const result = await transaction.invitation.updateMany({
          where: { id: invitationId, organizationId, status: 'PENDING' },
          data: { status: 'REVOKED', revokedAt: new Date() },
        })
        if (result.count !== 1)
          throw new Phase1Error('not_found', 404, 'Not found')
        await this.#audit(transaction, context, {
          action: 'invitation.revoked',
          organizationId,
          actorUserId: principal.userId,
          resourceType: 'Invitation',
          resourceId: invitationId,
        })
      },
    )
  }

  async updateMembership(
    principal: AuthPrincipal,
    membershipId: string,
    input: { status?: 'ACTIVE' | 'SUSPENDED'; roleId?: string },
    context: RequestContext,
  ) {
    const organizationId = this.#requireOrganization(principal)
    return this.#authorized(
      principal,
      organizationId,
      'membership.update',
      async (transaction) => {
        const membership = await transaction.membership.findUniqueOrThrow({
          where: {
            organizationId_id: { organizationId, id: membershipId },
          },
          include: { role: true },
        })
        const nextStatus = input.status ?? membership.status
        if (nextStatus !== membership.status)
          assertMembershipTransition(membership.status, nextStatus)
        const nextRole = input.roleId
          ? await transaction.role.findUniqueOrThrow({
              where: {
                organizationId_id: { organizationId, id: input.roleId },
              },
            })
          : membership.role
        await this.#lockOrganizationOwnership(transaction, organizationId)
        const activeOwnerCount = await transaction.membership.count({
          where: {
            organizationId,
            status: 'ACTIVE',
            role: { key: 'owner' },
          },
        })
        assertOwnerMutation({
          targetRole: membership.role.key as SystemRoleKey,
          activeOwnerCount,
          nextStatus,
          nextRole: nextRole.key as SystemRoleKey,
        })
        const updated = await transaction.membership.update({
          where: { id: membership.id },
          data: {
            roleId: nextRole.id,
            status: nextStatus,
            suspendedAt: nextStatus === 'SUSPENDED' ? new Date() : null,
          },
        })
        await this.#audit(transaction, context, {
          action:
            membership.roleId !== nextRole.id
              ? 'membership.role.changed'
              : 'membership.suspended',
          organizationId,
          actorUserId: principal.userId,
          resourceType: 'Membership',
          resourceId: membership.id,
          before: { roleId: membership.roleId, status: membership.status },
          after: { roleId: updated.roleId, status: updated.status },
        })
        await this.#outbox(transaction, context, {
          eventType:
            membership.roleId !== nextRole.id
              ? 'RoleAssigned'
              : nextStatus === 'SUSPENDED'
                ? 'MembershipSuspended'
                : 'MembershipActivated',
          organizationId,
          actorId: principal.userId,
          aggregateId: membership.id,
          payload: {
            membershipId: membership.id,
            roleId: updated.roleId,
            status: updated.status,
          },
        })
        return updated
      },
    )
  }

  async revokeMembership(
    principal: AuthPrincipal,
    membershipId: string,
    context: RequestContext,
  ): Promise<void> {
    const organizationId = this.#requireOrganization(principal)
    await this.#authorized(
      principal,
      organizationId,
      'membership.revoke',
      async (transaction) => {
        const membership = await transaction.membership.findUniqueOrThrow({
          where: {
            organizationId_id: { organizationId, id: membershipId },
          },
          include: { role: true },
        })
        await this.#lockOrganizationOwnership(transaction, organizationId)
        const activeOwnerCount = await transaction.membership.count({
          where: { organizationId, status: 'ACTIVE', role: { key: 'owner' } },
        })
        assertOwnerMutation({
          targetRole: membership.role.key as SystemRoleKey,
          activeOwnerCount,
          nextStatus: 'REVOKED',
        })
        await transaction.membership.update({
          where: { id: membership.id },
          data: { status: 'REVOKED', revokedAt: new Date() },
        })
        await this.#audit(transaction, context, {
          action: 'membership.revoked',
          organizationId,
          actorUserId: principal.userId,
          resourceType: 'Membership',
          resourceId: membership.id,
        })
        await this.#outbox(transaction, context, {
          eventType: 'MembershipRevoked',
          organizationId,
          actorId: principal.userId,
          aggregateId: membership.id,
          payload: { membershipId: membership.id },
        })
      },
    )
  }

  async listRoles(principal: AuthPrincipal) {
    const organizationId = this.#requireOrganization(principal)
    return this.#authorized(principal, organizationId, 'role.read', (tx) =>
      tx.role.findMany({
        where: { organizationId },
        include: { permissions: { include: { permission: true } } },
        orderBy: { name: 'asc' },
      }),
    )
  }

  async listPermissions(principal: AuthPrincipal) {
    const organizationId = this.#requireOrganization(principal)
    return this.#authorized(principal, organizationId, 'role.read', (tx) =>
      tx.permission.findMany({ orderBy: { key: 'asc' } }),
    )
  }

  async listTeams(
    principal: AuthPrincipal,
    input: { cursor?: string; limit?: number } = {},
  ) {
    const organizationId = this.#requireOrganization(principal)
    const limit = this.#limit(input.limit)
    return this.#authorized(principal, organizationId, 'team.read', (tx) =>
      tx.team
        .findMany({
          where: { organizationId },
          include: { members: true },
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
          ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        })
        .then((items) => this.#page(items, limit)),
    )
  }

  async getTeam(principal: AuthPrincipal, teamId: string) {
    const organizationId = this.#requireOrganization(principal)
    return this.#authorized(principal, organizationId, 'team.read', (tx) =>
      tx.team.findUniqueOrThrow({
        where: { organizationId_id: { organizationId, id: teamId } },
        include: { members: true },
      }),
    )
  }

  async createTeam(
    principal: AuthPrincipal,
    input: { name: string; description?: string; leaderMembershipId?: string },
    context: RequestContext,
  ) {
    const organizationId = this.#requireOrganization(principal)
    return this.#authorized(
      principal,
      organizationId,
      'team.create',
      async (transaction) => {
        if (input.leaderMembershipId)
          await this.#assertActiveMembership(
            transaction,
            organizationId,
            input.leaderMembershipId,
          )
        const team = await transaction.team.create({
          data: {
            organizationId,
            name: input.name.trim(),
            normalizedName: input.name.trim().normalize('NFKC').toLowerCase(),
            ...(input.description
              ? { description: input.description.trim() }
              : {}),
            ...(input.leaderMembershipId
              ? { leaderMembershipId: input.leaderMembershipId }
              : {}),
          },
        })
        await this.#audit(transaction, context, {
          action: 'team.created',
          organizationId,
          actorUserId: principal.userId,
          resourceType: 'Team',
          resourceId: team.id,
        })
        await this.#outbox(transaction, context, {
          eventType: 'TeamCreated',
          organizationId,
          actorId: principal.userId,
          aggregateId: team.id,
          payload: { teamId: team.id },
        })
        return team
      },
    )
  }

  async updateTeam(
    principal: AuthPrincipal,
    teamId: string,
    input: { name?: string; description?: string; leaderMembershipId?: string },
    context: RequestContext,
  ) {
    const organizationId = this.#requireOrganization(principal)
    return this.#authorized(
      principal,
      organizationId,
      'team.update',
      async (transaction) => {
        if (input.leaderMembershipId)
          await this.#assertActiveMembership(
            transaction,
            organizationId,
            input.leaderMembershipId,
          )
        const before = await transaction.team.findUniqueOrThrow({
          where: { organizationId_id: { organizationId, id: teamId } },
        })
        const team = await transaction.team.update({
          where: { id: teamId },
          data: {
            ...(input.name
              ? {
                  name: input.name.trim(),
                  normalizedName: input.name
                    .trim()
                    .normalize('NFKC')
                    .toLowerCase(),
                }
              : {}),
            ...(input.description !== undefined
              ? { description: input.description.trim() || null }
              : {}),
            ...(input.leaderMembershipId !== undefined
              ? { leaderMembershipId: input.leaderMembershipId || null }
              : {}),
          },
        })
        await this.#audit(transaction, context, {
          action: 'team.updated',
          organizationId,
          actorUserId: principal.userId,
          resourceType: 'Team',
          resourceId: teamId,
          before: { name: before.name, status: before.status },
          after: { name: team.name, status: team.status },
        })
        return team
      },
    )
  }

  async archiveTeam(
    principal: AuthPrincipal,
    teamId: string,
    context: RequestContext,
  ): Promise<void> {
    const organizationId = this.#requireOrganization(principal)
    await this.#authorized(
      principal,
      organizationId,
      'team.delete',
      async (transaction) => {
        await transaction.team.update({
          where: { organizationId_id: { organizationId, id: teamId } },
          data: { status: 'ARCHIVED' },
        })
        await this.#audit(transaction, context, {
          action: 'team.updated',
          organizationId,
          actorUserId: principal.userId,
          resourceType: 'Team',
          resourceId: teamId,
          after: { status: 'ARCHIVED' },
        })
      },
    )
  }

  async addTeamMember(
    principal: AuthPrincipal,
    teamId: string,
    membershipId: string,
    context: RequestContext,
  ) {
    const organizationId = this.#requireOrganization(principal)
    return this.#authorized(
      principal,
      organizationId,
      'team.update',
      async (transaction) => {
        await transaction.team.findUniqueOrThrow({
          where: { organizationId_id: { organizationId, id: teamId } },
        })
        await this.#assertActiveMembership(
          transaction,
          organizationId,
          membershipId,
        )
        const member = await transaction.teamMembership.create({
          data: { organizationId, teamId, membershipId },
        })
        await this.#audit(transaction, context, {
          action: 'team.member.added',
          organizationId,
          actorUserId: principal.userId,
          resourceType: 'Team',
          resourceId: teamId,
          metadata: { membershipId },
        })
        await this.#outbox(transaction, context, {
          eventType: 'TeamMemberAdded',
          organizationId,
          actorId: principal.userId,
          aggregateId: teamId,
          payload: { teamId, membershipId },
        })
        return member
      },
    )
  }

  async removeTeamMember(
    principal: AuthPrincipal,
    teamId: string,
    membershipId: string,
    context: RequestContext,
  ): Promise<void> {
    const organizationId = this.#requireOrganization(principal)
    await this.#authorized(
      principal,
      organizationId,
      'team.update',
      async (transaction) => {
        await transaction.teamMembership.delete({
          where: {
            organizationId_teamId_membershipId: {
              organizationId,
              teamId,
              membershipId,
            },
          },
        })
        await this.#audit(transaction, context, {
          action: 'team.member.removed',
          organizationId,
          actorUserId: principal.userId,
          resourceType: 'Team',
          resourceId: teamId,
          metadata: { membershipId },
        })
        await this.#outbox(transaction, context, {
          eventType: 'TeamMemberRemoved',
          organizationId,
          actorId: principal.userId,
          aggregateId: teamId,
          payload: { teamId, membershipId },
        })
      },
    )
  }

  async listAuditLogs(
    principal: AuthPrincipal,
    input: { cursor?: string; action?: string; limit?: number },
  ) {
    const organizationId = this.#requireOrganization(principal)
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 100)
    return this.#authorized(principal, organizationId, 'audit.read', (tx) =>
      tx.auditLog
        .findMany({
          where: {
            organizationId,
            ...(input.action ? { action: input.action } : {}),
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
          ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        })
        .then((items) => this.#page(items, limit)),
    )
  }

  async #authorized<T>(
    principal: AuthPrincipal,
    organizationId: string,
    permission: PermissionKey,
    operation: (transaction: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    if (principal.organizationId !== organizationId)
      throw new Phase1Error('not_found', 404, 'Not found')
    return withTenant(
      this.#db(),
      { userId: principal.userId, organizationId },
      async (transaction) => {
        const membership = await transaction.membership.findUnique({
          where: {
            organizationId_userId: { organizationId, userId: principal.userId },
          },
          include: {
            organization: true,
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        })
        if (!membership) throw new Phase1Error('not_found', 404, 'Not found')
        assertAuthorized({
          permission,
          permissions: new Set(
            membership.role.permissions.map(
              (item) => item.permission.key as PermissionKey,
            ),
          ),
          membershipStatus: membership.status,
          organizationStatus: membership.organization.status,
        })
        return operation(transaction)
      },
    )
  }

  async #assertActiveMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    membershipId: string,
  ): Promise<void> {
    const membership = await transaction.membership.findUnique({
      where: { organizationId_id: { organizationId, id: membershipId } },
      select: { status: true },
    })
    if (membership?.status !== 'ACTIVE')
      throw new Phase1Error(
        'membership_inactive',
        422,
        'Membership is inactive',
      )
  }

  async #lockOrganizationOwnership(
    transaction: DatabaseTransaction,
    organizationId: string,
  ): Promise<void> {
    await transaction.$queryRaw`
      SELECT "id"
      FROM "organization_organizations"
      WHERE "id" = ${organizationId}::uuid
      FOR UPDATE
    `
  }

  async #revokeSession(
    userId: string,
    sessionId: string,
    reason: string,
  ): Promise<void> {
    const result = await this.#db().$transaction(async (transaction) => {
      const revoked = await transaction.session.updateMany({
        where: { id: sessionId, userId, status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokeReason: reason,
        },
      })
      if (revoked.count === 1)
        await transaction.refreshToken.updateMany({
          where: { sessionId, status: 'ACTIVE' },
          data: { status: 'REVOKED', revokedAt: new Date() },
        })
      return revoked
    })
    if (result.count !== 1) throw new Phase1Error('not_found', 404, 'Not found')
  }

  async #revokeSessionFamily(sessionId: string, reason: string): Promise<void> {
    await this.#db().$transaction(async (transaction) => {
      await transaction.session.updateMany({
        where: { id: sessionId },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokeReason: reason,
        },
      })
      await transaction.refreshToken.updateMany({
        where: { sessionId, status: { in: ['ACTIVE', 'ROTATED'] } },
        data: { status: 'REVOKED', revokedAt: new Date() },
      })
    })
  }

  async #audit(
    transaction: DatabaseTransaction | DatabaseClient,
    context: RequestContext,
    input: {
      action: AuditAction
      organizationId?: string
      actorUserId?: string
      actorMembershipId?: string
      resourceType: string
      resourceId?: string
      metadata?: Readonly<Record<string, unknown>>
      before?: Readonly<Record<string, unknown>>
      after?: Readonly<Record<string, unknown>>
    },
  ): Promise<void> {
    const actorMembershipId =
      input.actorMembershipId ??
      (input.organizationId && input.actorUserId
        ? (
            await transaction.membership.findUnique({
              where: {
                organizationId_userId: {
                  organizationId: input.organizationId,
                  userId: input.actorUserId,
                },
              },
              select: { id: true },
            })
          )?.id
        : undefined)
    // createMany intentionally avoids INSERT ... RETURNING. Identity audit rows are
    // written before an authenticated user context exists, while RLS correctly
    // prevents those rows from being read back by an anonymous request.
    await transaction.auditLog.createMany({
      data: [
        {
          action: input.action,
          resourceType: input.resourceType,
          correlationId: context.correlationId,
          ...(input.organizationId
            ? { organizationId: input.organizationId }
            : {}),
          ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
          ...(actorMembershipId && input.organizationId
            ? { actorMembershipId }
            : {}),
          ...(input.resourceId ? { resourceId: input.resourceId } : {}),
          ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
          ...(context.userAgent ? { userAgent: context.userAgent } : {}),
          ...(context.traceId ? { traceId: context.traceId } : {}),
          ...(input.metadata
            ? { metadata: sanitizeAuditMetadata(input.metadata) as object }
            : {}),
          ...(input.before
            ? { before: sanitizeAuditMetadata(input.before) as object }
            : {}),
          ...(input.after
            ? { after: sanitizeAuditMetadata(input.after) as object }
            : {}),
        },
      ],
    })
  }

  async #outbox(
    transaction: DatabaseTransaction,
    context: RequestContext,
    input: {
      eventType: string
      organizationId?: string
      actorId?: string
      aggregateId?: string
      aggregateVersion?: number
      payload: Readonly<Record<string, unknown>>
    },
  ): Promise<void> {
    await transaction.outboxEvent.create({
      data: {
        id: randomUUID(),
        idempotencyKey: `${context.correlationId}:${input.eventType}:${input.aggregateId ?? 'global'}`,
        eventType: input.eventType,
        eventVersion: 1,
        source: 'nexo.phase1',
        correlationId: context.correlationId,
        occurredAt: new Date(),
        ...(input.organizationId
          ? { organization: { connect: { id: input.organizationId } } }
          : {}),
        ...(input.actorId ? { actorId: input.actorId } : {}),
        ...(input.aggregateId ? { aggregateId: input.aggregateId } : {}),
        ...(input.aggregateVersion !== undefined
          ? { aggregateVersion: input.aggregateVersion }
          : {}),
        payload: input.payload as object,
      },
    })
  }

  #requireOrganization(principal: AuthPrincipal): string {
    if (!principal.organizationId)
      throw new Phase1Error(
        'organization_required',
        409,
        'Select an organization',
      )
    return principal.organizationId
  }

  #limit(value?: number): number {
    return Number.isFinite(value) ? Math.min(Math.max(value ?? 25, 1), 100) : 25
  }

  #page<T extends { id: string }>(items: T[], limit: number) {
    const hasMore = items.length > limit
    const pageItems = hasMore ? items.slice(0, limit) : items
    return {
      items: pageItems,
      nextCursor: hasMore
        ? (pageItems[pageItems.length - 1]?.id ?? null)
        : null,
    }
  }

  #db(): DatabaseClient {
    if (!this.#database && this.#databaseUrl)
      this.#database = createDatabaseClient(this.#databaseUrl)
    if (!this.#database)
      throw new Phase1Error(
        'database_unavailable',
        503,
        'Database is not configured',
      )
    return this.#database
  }

  #tokenService(): JwtAccessTokenService {
    if (!this.#tokens) throw new Error('Token service is not initialized')
    return this.#tokens
  }

  #isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    )
  }
}
