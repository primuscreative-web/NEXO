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
): Promise<T> {
  const method = init.method?.toUpperCase() ?? 'GET'
  const csrf = !['GET', 'HEAD', 'OPTIONS'].includes(method)
    ? csrfToken()
    : undefined
  const headers = new Headers(init.headers)
  if (!headers.has('content-type'))
    headers.set('content-type', 'application/json')
  if (csrf) headers.set('x-csrf-token', decodeURIComponent(csrf))
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })
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
