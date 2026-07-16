const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isTrustedMutationOrigin(input: {
  method: string
  origin?: string
  allowedOrigins: readonly string[]
}): boolean {
  if (safeMethods.has(input.method.toUpperCase()) || !input.origin) return true
  return input.allowedOrigins.includes(input.origin)
}
