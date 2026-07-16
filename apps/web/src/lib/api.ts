export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function csrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined
  return document.cookie
    .split('; ')
    .find((item) => item.startsWith('nexo_csrf='))
    ?.split('=')[1]
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const method = init.method?.toUpperCase() ?? 'GET'
  const csrf = !['GET', 'HEAD', 'OPTIONS'].includes(method)
    ? csrfToken()
    : undefined
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has('content-type'))
    headers.set('content-type', 'application/json')
  if (csrf) headers.set('x-csrf-token', decodeURIComponent(csrf))
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    cache: init.cache ?? 'no-store',
    credentials: 'include',
    headers,
  })
  if (
    response.status === 401 &&
    retry &&
    !path.startsWith('/v1/auth/login') &&
    !path.startsWith('/v1/auth/refresh')
  ) {
    try {
      await apiFetch('/v1/auth/refresh', { method: 'POST' }, false)
      return await apiFetch<T>(path, init, false)
    } catch {
      if (typeof window !== 'undefined')
        window.location.assign('/login?expired=1')
    }
  }
  if (response.status === 204) return undefined as T
  const body = (await response.json()) as T & {
    error?: { code: string; message: string }
  }
  if (!response.ok)
    throw new Error(
      body.error?.message ?? 'Não foi possível concluir a operação.',
    )
  return body
}
