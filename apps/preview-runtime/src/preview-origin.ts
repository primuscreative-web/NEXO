export function isVercelNexoPreviewOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return (
      url.protocol === 'https:' &&
      /^nexo-[a-z0-9-]+-primuscreative-webs-projects\.vercel\.app$/u.test(
        url.hostname,
      )
    )
  } catch {
    return false
  }
}

export function isAllowedPreviewOrigin(
  origin: string | undefined,
  configuredOrigins: readonly string[],
): boolean {
  if (!origin) return false
  return configuredOrigins.includes(origin) || isVercelNexoPreviewOrigin(origin)
}
