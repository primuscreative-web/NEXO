import { describe, expect, it } from 'vitest'
import { isTrustedMutationOrigin } from '../src/phase1/request-origin.js'

const allowedOrigins = ['https://app.nexo.example', 'http://localhost:3000']

describe('trusted mutation origins', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])('allows safe method %s', (method) => {
    expect(
      isTrustedMutationOrigin({
        method,
        origin: 'https://attacker.example',
        allowedOrigins,
      }),
    ).toBe(true)
  })

  it('rejects browser mutations from untrusted origins', () => {
    expect(
      isTrustedMutationOrigin({
        method: 'POST',
        origin: 'https://attacker.example',
        allowedOrigins,
      }),
    ).toBe(false)
  })

  it('allows trusted browser origins and non-browser clients', () => {
    expect(
      isTrustedMutationOrigin({
        method: 'PATCH',
        origin: 'https://app.nexo.example',
        allowedOrigins,
      }),
    ).toBe(true)
    expect(isTrustedMutationOrigin({ method: 'DELETE', allowedOrigins })).toBe(
      true,
    )
  })
})
