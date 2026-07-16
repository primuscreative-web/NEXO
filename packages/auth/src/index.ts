import { createHash, randomBytes } from 'node:crypto'
import * as argon2 from 'argon2'
import {
  SignJWT,
  jwtVerify,
  importPKCS8,
  importSPKI,
  type JWTPayload,
} from 'jose'

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(hash: string, password: string): Promise<boolean>
}

export class Argon2idPasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    })
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password)
    } catch {
      return false
    }
  }
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export interface AccessTokenClaims extends JWTPayload {
  readonly sub: string
  readonly sid: string
  readonly org?: string
  readonly type: 'access'
}

export interface AccessTokenConfiguration {
  readonly privateKeyPem: string
  readonly publicKeyPem: string
  readonly issuer: string
  readonly audience: string
  readonly expiresInSeconds?: number
  readonly keyId?: string
}

export class JwtAccessTokenService {
  constructor(private readonly configuration: AccessTokenConfiguration) {}

  async sign(input: {
    userId: string
    sessionId: string
    organizationId?: string
  }): Promise<string> {
    const key = await importPKCS8(this.configuration.privateKeyPem, 'EdDSA')
    const token = new SignJWT({
      sid: input.sessionId,
      type: 'access',
      ...(input.organizationId ? { org: input.organizationId } : {}),
    })
      .setProtectedHeader({
        alg: 'EdDSA',
        typ: 'JWT',
        kid: this.configuration.keyId ?? 'primary',
      })
      .setSubject(input.userId)
      .setIssuer(this.configuration.issuer)
      .setAudience(this.configuration.audience)
      .setIssuedAt()
      .setExpirationTime(
        `${this.configuration.expiresInSeconds ?? 900} seconds`,
      )
    return token.sign(key)
  }

  async verify(token: string): Promise<AccessTokenClaims> {
    const key = await importSPKI(this.configuration.publicKeyPem, 'EdDSA')
    const { payload } = await jwtVerify(token, key, {
      issuer: this.configuration.issuer,
      audience: this.configuration.audience,
      algorithms: ['EdDSA'],
      requiredClaims: ['sub', 'sid', 'type'],
    })
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string' ||
      payload.type !== 'access' ||
      (payload.org !== undefined && typeof payload.org !== 'string')
    ) {
      throw new Error('Invalid access token claims')
    }
    return payload as AccessTokenClaims
  }
}
