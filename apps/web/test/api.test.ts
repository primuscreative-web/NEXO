import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../src/lib/api'

afterEach(() => {
  vi.unstubAllGlobals()
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
})
