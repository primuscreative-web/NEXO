const defaultApiUrl =
  process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    ? 'http://localhost:3001'
    : '/api'

export const apiUrl = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL)

const defaultTimeoutMilliseconds = 120_000

export function resolveApiUrl(value: string | undefined): string {
  const normalized = value?.trim()
  const candidate = normalized?.length ? normalized : defaultApiUrl
  if (candidate.startsWith('/')) return candidate.replace(/\/$/u, '')
  const url = new URL(candidate)
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('NEXT_PUBLIC_API_URL must use HTTP(S) or a relative path')
  if (
    process.env.NODE_ENV === 'production' &&
    ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  )
    throw new Error('NEXT_PUBLIC_API_URL cannot target localhost in production')
  return candidate.replace(/\/$/u, '')
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function normalizeApiError(cause: unknown): ApiError {
  if (cause instanceof ApiError) return cause
  if (cause instanceof DOMException && cause.name === 'AbortError')
    return new ApiError(
      'request_timeout',
      0,
      'A conexão demorou mais que o esperado. Tente novamente.',
    )
  return new ApiError(
    'network_unavailable',
    0,
    'Não foi possível conectar ao NEXO agora. Tente novamente em alguns instantes.',
  )
}

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
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    defaultTimeoutMilliseconds,
  )
  let response: Response
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      cache: init.cache ?? 'no-store',
      credentials: 'include',
      headers,
      signal: init.signal ?? controller.signal,
    })
  } catch (cause) {
    throw normalizeApiError(cause)
  } finally {
    clearTimeout(timeout)
  }
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
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: { code: string; message: string; correlationId?: string }
  }
  if (!response.ok)
    throw new ApiError(
      body.error?.code ?? 'unexpected_error',
      response.status,
      friendlyHttpMessage(
        body.error?.code,
        response.status,
        body.error?.message,
      ),
    )
  return body
}

function friendlyHttpMessage(
  code: string | undefined,
  status: number,
  fallback: string | undefined,
): string {
  if (code === 'invalid_credentials') return 'E-mail ou senha inválidos.'
  if (code === 'unauthorized' || code === 'invalid_refresh')
    return 'Sua sessão expirou. Entre novamente.'
  if (status === 429)
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  if (status >= 500)
    return 'O NEXO encontrou uma instabilidade. Tente novamente em alguns instantes.'
  return fallback ?? 'Não foi possível concluir a operação.'
}
