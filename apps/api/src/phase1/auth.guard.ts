import { Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { AuthPrincipal } from './phase1.service.js'
import { Phase1Service } from './phase1.service.js'

const publicRouteKey = 'nexo:public-route'
export const Public = () => SetMetadata(publicRouteKey, true)

export interface AuthenticatedRequest {
  headers: Readonly<Record<string, string | string[] | undefined>>
  cookies?: Readonly<Record<string, string | undefined>>
  principal?: AuthPrincipal
  ip?: string
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly phase1: Phase1Service,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(publicRouteKey, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authorization = request.headers.authorization
    const bearer =
      typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice(7)
        : undefined
    const token = bearer ?? request.cookies?.nexo_access
    if (!token) throw new UnauthorizedException()
    try {
      request.principal = await this.phase1.verifyAccessToken(token)
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }
}
