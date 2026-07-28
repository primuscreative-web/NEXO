import { parsePort } from '@nexo/config'

export function assertPreviewRuntimeEnvironment(
  environment: NodeJS.ProcessEnv,
): void {
  if (environment.DEPLOYMENT_ENV !== 'preview')
    throw new Error('Preview runtime requires DEPLOYMENT_ENV=preview')
  if (environment.APP_ENV && environment.APP_ENV !== 'preview')
    throw new Error('Preview runtime refuses non-preview APP_ENV')
  if (environment.NODE_ENV === 'test') return
  if (!environment.DATABASE_URL) throw new Error('Missing DATABASE_URL')
  if (!environment.REDIS_URL) throw new Error('Missing REDIS_URL')
  if (!environment.AUTH_JWT_PRIVATE_KEY)
    throw new Error('Missing AUTH_JWT_PRIVATE_KEY')
  if (!environment.AUTH_JWT_PUBLIC_KEY)
    throw new Error('Missing AUTH_JWT_PUBLIC_KEY')
  if (!environment.WEB_ORIGIN) throw new Error('Missing WEB_ORIGIN')
  if (
    !environment.PREVIEW_MAILBOX_ACCESS_KEY ||
    environment.PREVIEW_MAILBOX_ACCESS_KEY.length < 32
  )
    throw new Error('Missing or weak PREVIEW_MAILBOX_ACCESS_KEY')
}

export function previewRuntimePort(environment: NodeJS.ProcessEnv): number {
  return parsePort(environment.PORT ?? environment.API_PORT, 3001)
}
