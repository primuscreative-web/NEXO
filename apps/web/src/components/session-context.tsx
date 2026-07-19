'use client'

import type { PermissionKey } from '@nexo/organization'
import { useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { apiFetch } from '../lib/api'
import { tenantQueryCache } from '../lib/tenant-cache'

export interface CurrentUser {
  id: string
  email: string
  name: string
  status: string
  locale: string
  timezone: string
  activeOrganizationId: string | null
}

export interface OrganizationAccess {
  organization: {
    id: string
    name: string
    slug: string
    status: string
    locale: string
    timezone: string
  }
  role: {
    key: string
    name: string
    permissions: PermissionKey[]
  }
}

interface SessionContextValue {
  user: CurrentUser | null
  organizations: readonly OrganizationAccess[]
  activeOrganization: OrganizationAccess | null
  permissions: ReadonlySet<PermissionKey>
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  selectOrganization: (organizationId: string) => Promise<void>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      const [current, access] = await Promise.all([
        tenantQueryCache.getOrCreate({ kind: 'global' }, 'me', () =>
          apiFetch<CurrentUser>('/v1/auth/me'),
        ),
        tenantQueryCache.getOrCreate({ kind: 'global' }, 'organizations', () =>
          apiFetch<OrganizationAccess[]>('/v1/organizations'),
        ),
      ])
      setUser(current)
      setOrganizations(access)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível carregar sua sessão.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const activeOrganization =
    organizations.find(
      ({ organization }) => organization.id === user?.activeOrganizationId,
    ) ?? null
  const permissions = useMemo(
    () => new Set(activeOrganization?.role.permissions ?? []),
    [activeOrganization],
  )

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      organizations,
      activeOrganization,
      permissions,
      loading,
      error,
      reload,
      async selectOrganization(organizationId) {
        const previous = user?.activeOrganizationId
        await apiFetch(`/v1/organizations/${organizationId}/select`, {
          method: 'POST',
        })
        if (previous) tenantQueryCache.clearOrganization(previous)
        tenantQueryCache.clearAll()
        setLoading(true)
        await reload()
        router.push('/dashboard')
        router.refresh()
      },
      async logout() {
        try {
          await apiFetch('/v1/auth/logout', { method: 'POST' })
        } finally {
          tenantQueryCache.clearAll()
          setUser(null)
          setOrganizations([])
          router.replace('/login')
          router.refresh()
        }
      },
    }),
    [
      activeOrganization,
      error,
      loading,
      organizations,
      permissions,
      reload,
      router,
      user,
    ],
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context)
    throw new Error('useSession must be used inside SessionProvider')
  return context
}
