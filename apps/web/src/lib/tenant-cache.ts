export type CacheScope =
  | { kind: 'global' }
  | { kind: 'organization'; id: string }

interface CacheEntry<T> {
  value: Promise<T>
  expiresAt: number
}

export class TenantQueryCache {
  readonly #entries = new Map<string, CacheEntry<unknown>>()
  #generation = 0

  get generation(): number {
    return this.#generation
  }

  getOrCreate<T>(
    scope: CacheScope,
    resource: string,
    loader: () => Promise<T>,
    ttlMs = 30_000,
  ): Promise<T> {
    const key = this.#key(scope, resource)
    const existing = this.#entries.get(key) as CacheEntry<T> | undefined
    if (existing && existing.expiresAt > Date.now()) return existing.value
    const value = loader().catch((error: unknown) => {
      this.#entries.delete(key)
      throw error
    })
    this.#entries.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  }

  invalidate(scope: CacheScope, resourcePrefix = ''): void {
    const prefix = `${this.#scopeKey(scope)}:${resourcePrefix}`
    for (const key of this.#entries.keys()) {
      if (key.startsWith(prefix)) this.#entries.delete(key)
    }
    this.#generation += 1
  }

  clearOrganization(organizationId: string): void {
    this.invalidate({ kind: 'organization', id: organizationId })
  }

  clearAll(): void {
    this.#entries.clear()
    this.#generation += 1
  }

  #key(scope: CacheScope, resource: string): string {
    return `${this.#scopeKey(scope)}:${resource}`
  }

  #scopeKey(scope: CacheScope): string {
    return scope.kind === 'global' ? 'global' : `organization:${scope.id}`
  }
}

export const tenantQueryCache = new TenantQueryCache()
