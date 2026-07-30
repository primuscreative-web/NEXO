import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  apiFetch,
  normalizeApiError,
  resolveApiUrl,
} from '../src/lib/api'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('apiFetch', () => {
  it('does not declare JSON when a mutation has no body', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).has('content-type')).toBe(false)
      return new Response(null, { status: 204 })
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/v1/organizations/example/select', { method: 'POST' })

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('declares JSON when a request body is present', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('content-type')).toBe(
        'application/json',
      )
      return new Response(null, { status: 204 })
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/v1/organizations', {
      method: 'POST',
      body: JSON.stringify({ name: 'NEXO' }),
    })

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('always includes credentials for authentication cookies', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.credentials).toBe('include')
      return new Response(null, { status: 204 })
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/v1/auth/login', { method: 'POST' })
  })

  it('rejects localhost as an explicit production API', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => resolveApiUrl('http://localhost:3001')).toThrow(
      'cannot target localhost',
    )
  })

  it('accepts a same-origin Preview proxy without duplicating slashes', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(resolveApiUrl('/api/')).toBe('/api')
  })

  it('normalizes timeout and network failures without leaking browser errors', () => {
    expect(
      normalizeApiError(new DOMException('aborted', 'AbortError')).code,
    ).toBe('request_timeout')
    const network = normalizeApiError(new TypeError('Failed to fetch'))
    expect(network.code).toBe('network_unavailable')
    expect(network.message).not.toContain('Failed to fetch')
  })

  it('preserves already normalized API errors', () => {
    const error = new ApiError('invalid_credentials', 401, 'friendly')
    expect(normalizeApiError(error)).toBe(error)
  })
})
