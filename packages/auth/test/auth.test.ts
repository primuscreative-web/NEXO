import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose'
import { describe, expect, it } from 'vitest'
import {
  Argon2idPasswordHasher,
  JwtAccessTokenService,
  generateOpaqueToken,
  hashOpaqueToken,
} from '../src/index.js'

describe('authentication adapters', () => {
  it('hashes and verifies passwords with Argon2id', async () => {
    const hasher = new Argon2idPasswordHasher()
    const hash = await hasher.hash('Nexo-secure-passphrase-2026')
    await expect(
      hasher.verify(hash, 'Nexo-secure-passphrase-2026'),
    ).resolves.toBe(true)
    await expect(hasher.verify(hash, 'incorrect')).resolves.toBe(false)
  })

  it('creates high-entropy opaque tokens and deterministic hashes', () => {
    const token = generateOpaqueToken()
    expect(token).toHaveLength(43)
    expect(hashOpaqueToken(token)).toHaveLength(64)
    expect(hashOpaqueToken(token)).toBe(hashOpaqueToken(token))
  })

  it('signs and validates asymmetric short-lived access tokens', async () => {
    const { privateKey, publicKey } = await generateKeyPair('EdDSA', {
      crv: 'Ed25519',
      extractable: true,
    })
    const service = new JwtAccessTokenService({
      privateKeyPem: await exportPKCS8(privateKey),
      publicKeyPem: await exportSPKI(publicKey),
      issuer: 'nexo-test',
      audience: 'nexo-api',
    })
    const token = await service.sign({
      userId: 'a1b1c1d1-e1f1-4011-8011-111111111111',
      sessionId: 'a2b2c2d2-e2f2-4022-8022-222222222222',
    })
    await expect(service.verify(token)).resolves.toMatchObject({
      sub: 'a1b1c1d1-e1f1-4011-8011-111111111111',
      sid: 'a2b2c2d2-e2f2-4022-8022-222222222222',
      type: 'access',
    })
  })
})
