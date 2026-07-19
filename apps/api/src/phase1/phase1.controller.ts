import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { AuthenticatedRequest } from './auth.guard.js'
import { Public } from './auth.guard.js'
import {
  AddTeamMemberDto,
  ChangePasswordDto,
  CreateOrganizationDto,
  CreateTeamDto,
  ForgotPasswordDto,
  InvitationDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateMembershipDto,
  UpdateOrganizationDto,
  UpdateTeamDto,
  VerifyEmailDto,
} from './dto.js'
import { Phase1Error, Phase1Service } from './phase1.service.js'

// The disposable E2E suite provisions several unique accounts in one minute.
// Every production-like environment keeps the security baseline of five.
const registrationRateLimit = process.env.NODE_ENV === 'test' ? 20 : 5

interface CookieReply {
  setCookie(name: string, value: string, options: object): void
  clearCookie(name: string, options: object): void
}

@ApiTags('Phase 1')
@ApiBearerAuth()
@Controller('v1')
export class Phase1Controller {
  constructor(@Inject(Phase1Service) private readonly phase1: Phase1Service) {}

  @Public()
  @Post('auth/register')
  @Throttle({ default: { limit: registrationRateLimit, ttl: 60_000 } })
  register(@Body() body: RegisterDto, @Req() request: AuthenticatedRequest) {
    return this.phase1.register(body, this.#context(request))
  }

  @Public()
  @Post('auth/verify-email')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.phase1.verifyEmail(body.token)
  }

  @Public()
  @Post('auth/login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() body: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: CookieReply,
  ) {
    const result = await this.phase1.login(body, this.#context(request))
    this.#setAuthCookies(reply, result)
    return { user: result.user, sessionId: result.sessionId }
  }

  @Public()
  @Post('auth/refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrfHeader: string | undefined,
    @Res({ passthrough: true }) reply: CookieReply,
  ) {
    const refreshToken = request.cookies?.nexo_refresh
    const csrfToken = request.cookies?.nexo_csrf
    if (!refreshToken || !csrfToken || csrfHeader !== csrfToken)
      throw new Phase1Error('invalid_refresh', 401, 'Unauthorized')
    const result = await this.phase1.refresh(
      refreshToken,
      csrfToken,
      this.#context(request),
    )
    this.#setAuthCookies(reply, result)
    return { user: result.user, sessionId: result.sessionId }
  }

  @Post('auth/logout')
  @HttpCode(204)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
    @Res({ passthrough: true }) reply: CookieReply,
  ) {
    this.#assertCsrf(request, csrf)
    await this.phase1.logout(this.#principal(request), this.#context(request))
    this.#clearAuthCookies(reply)
  }

  @Public()
  @Post('auth/forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.phase1.forgotPassword(body.email)
  }

  @Public()
  @Post('auth/reset-password')
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(
    @Body() body: ResetPasswordDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.phase1.resetPassword(
      body.token,
      body.password,
      this.#context(request),
    )
  }

  @Post('auth/change-password')
  @HttpCode(204)
  changePassword(
    @Body() body: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.changePassword(
      this.#principal(request),
      body.currentPassword,
      body.nextPassword,
      this.#context(request),
    )
  }

  @Get('auth/sessions')
  sessions(@Req() request: AuthenticatedRequest) {
    return this.phase1.listSessions(this.#principal(request))
  }

  @Delete('auth/sessions/:id')
  @HttpCode(204)
  revokeSession(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.revokeSession(
      this.#principal(request),
      id,
      this.#context(request),
    )
  }

  @Post('auth/sessions/revoke-others')
  revokeOtherSessions(
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.revokeOtherSessions(this.#principal(request))
  }

  @Get('auth/me')
  me(@Req() request: AuthenticatedRequest) {
    return this.phase1.me(this.#principal(request))
  }

  @Get('organizations')
  organizations(@Req() request: AuthenticatedRequest) {
    return this.phase1.listOrganizations(this.#principal(request))
  }

  @Post('organizations')
  createOrganization(
    @Body() body: CreateOrganizationDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.createOrganization(
      this.#principal(request),
      body,
      this.#context(request),
    )
  }

  @Get('organizations/:id')
  organization(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.phase1.getOrganization(this.#principal(request), id)
  }

  @Patch('organizations/:id')
  updateOrganization(
    @Param('id') id: string,
    @Body() body: UpdateOrganizationDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.updateOrganization(
      this.#principal(request),
      id,
      body,
      this.#context(request),
    )
  }

  @Post('organizations/:id/select')
  async selectOrganization(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
    @Res({ passthrough: true }) reply: CookieReply,
  ) {
    this.#assertCsrf(request, csrf)
    const accessToken = await this.phase1.selectOrganization(
      this.#principal(request),
      id,
    )
    reply.setCookie('nexo_access', accessToken, this.#accessCookie())
    return { organizationId: id }
  }

  @Get('organizations/:organizationId/memberships')
  memberships(
    @Param('organizationId') organizationId: string,
    @Req() request: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.phase1.listMemberships(
      this.#principal(request),
      organizationId,
      this.#page(cursor, limit),
    )
  }

  @Post('organizations/:organizationId/invitations')
  invite(
    @Param('organizationId') organizationId: string,
    @Body() body: InvitationDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.invite(
      this.#principal(request),
      organizationId,
      body,
      this.#context(request),
    )
  }

  @Post('invitations/:token/accept')
  acceptInvitation(
    @Param('token') token: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.acceptInvitation(
      this.#principal(request),
      token,
      this.#context(request),
    )
  }

  @Post('invitations/:id/resend')
  resendInvitation(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.resendInvitation(
      this.#principal(request),
      id,
      this.#context(request),
    )
  }

  @Delete('invitations/:id')
  @HttpCode(204)
  revokeInvitation(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.revokeInvitation(
      this.#principal(request),
      id,
      this.#context(request),
    )
  }

  @Patch('memberships/:id')
  updateMembership(
    @Param('id') id: string,
    @Body() body: UpdateMembershipDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.updateMembership(
      this.#principal(request),
      id,
      body,
      this.#context(request),
    )
  }

  @Delete('memberships/:id')
  @HttpCode(204)
  revokeMembership(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.revokeMembership(
      this.#principal(request),
      id,
      this.#context(request),
    )
  }

  @Get('roles')
  roles(@Req() request: AuthenticatedRequest) {
    return this.phase1.listRoles(this.#principal(request))
  }

  @Get('permissions')
  permissions(@Req() request: AuthenticatedRequest) {
    return this.phase1.listPermissions(this.#principal(request))
  }

  @Get('teams')
  teams(
    @Req() request: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.phase1.listTeams(
      this.#principal(request),
      this.#page(cursor, limit),
    )
  }

  @Get('teams/:id')
  team(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.phase1.getTeam(this.#principal(request), id)
  }

  @Post('teams')
  createTeam(
    @Body() body: CreateTeamDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.createTeam(
      this.#principal(request),
      body,
      this.#context(request),
    )
  }

  @Patch('teams/:id')
  updateTeam(
    @Param('id') id: string,
    @Body() body: UpdateTeamDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.updateTeam(
      this.#principal(request),
      id,
      body,
      this.#context(request),
    )
  }

  @Delete('teams/:id')
  @HttpCode(204)
  archiveTeam(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.archiveTeam(
      this.#principal(request),
      id,
      this.#context(request),
    )
  }

  @Post('teams/:id/members')
  addTeamMember(
    @Param('id') id: string,
    @Body() body: AddTeamMemberDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.addTeamMember(
      this.#principal(request),
      id,
      body.membershipId,
      this.#context(request),
    )
  }

  @Delete('teams/:id/members/:membershipId')
  @HttpCode(204)
  removeTeamMember(
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrf: string | undefined,
  ) {
    this.#assertCsrf(request, csrf)
    return this.phase1.removeTeamMember(
      this.#principal(request),
      id,
      membershipId,
      this.#context(request),
    )
  }

  @Get('audit-logs')
  auditLogs(
    @Req() request: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    return this.phase1.listAuditLogs(this.#principal(request), {
      ...(cursor ? { cursor } : {}),
      ...(action ? { action } : {}),
      ...(limit ? { limit: Number(limit) } : {}),
    })
  }

  #principal(request: AuthenticatedRequest) {
    if (!request.principal)
      throw new Phase1Error('unauthorized', 401, 'Unauthorized')
    return request.principal
  }

  #context(request: AuthenticatedRequest) {
    const correlation = request.headers['x-correlation-id']
    const causation = request.headers['x-causation-id']
    const trace = request.headers.traceparent
    const userAgent = request.headers['user-agent']
    return {
      correlationId:
        typeof correlation === 'string' && isUuid(correlation)
          ? correlation
          : crypto.randomUUID(),
      ...(typeof causation === 'string' && isUuid(causation)
        ? { causationId: causation }
        : {}),
      ...(typeof trace === 'string' ? { traceId: trace.slice(0, 64) } : {}),
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
    }
  }

  #assertCsrf(request: AuthenticatedRequest, header: string | undefined): void {
    if (!header || header !== request.cookies?.nexo_csrf)
      throw new Phase1Error('invalid_csrf', 403, 'Forbidden')
  }

  #page(cursor?: string, limit?: string) {
    return {
      ...(cursor ? { cursor } : {}),
      ...(limit ? { limit: Number(limit) } : {}),
    }
  }

  #setAuthCookies(
    reply: CookieReply,
    result: { accessToken: string; refreshToken: string; csrfToken: string },
  ): void {
    reply.setCookie('nexo_access', result.accessToken, this.#accessCookie())
    reply.setCookie('nexo_refresh', result.refreshToken, {
      ...this.#secureCookie(),
      path: '/v1/auth',
      maxAge: 30 * 24 * 60 * 60,
    })
    reply.setCookie('nexo_csrf', result.csrfToken, {
      ...this.#cookieScope(),
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })
  }

  #clearAuthCookies(reply: CookieReply): void {
    reply.clearCookie('nexo_access', { ...this.#cookieScope(), path: '/' })
    reply.clearCookie('nexo_refresh', {
      ...this.#cookieScope(),
      path: '/v1/auth',
    })
    reply.clearCookie('nexo_csrf', { ...this.#cookieScope(), path: '/' })
  }

  #accessCookie() {
    return { ...this.#secureCookie(), path: '/', maxAge: 15 * 60 }
  }

  #secureCookie() {
    return {
      httpOnly: true,
      ...this.#cookieScope(),
      sameSite: 'lax' as const,
    }
  }

  #cookieScope() {
    return {
      secure:
        process.env.COOKIE_SECURE === 'true' ||
        process.env.NODE_ENV === 'production',
      ...(process.env.COOKIE_DOMAIN
        ? { domain: process.env.COOKIE_DOMAIN }
        : {}),
    }
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  )
}
