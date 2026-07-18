import { describe, expect, it, vi } from 'vitest'
import {
  formatCurrency,
  formatDateTime,
  resolveTimezone,
} from '../src/lib/format'
import { plural, t, translationNamespaces } from '../src/lib/i18n'
import {
  breadcrumbsFor,
  currentRoute,
  routeAllowed,
  routes,
} from '../src/lib/navigation'
import { TenantQueryCache } from '../src/lib/tenant-cache'
import { isThemePreference, resolveTheme } from '../src/lib/theme'

describe('Phase 2 frontend foundation', () => {
  it('keeps navigation typed and produces stable breadcrumbs', () => {
    expect(currentRoute('/settings/members')?.permission).toBe(
      'membership.read',
    )
    expect(
      breadcrumbsFor('/settings/members').map(({ label }) => label),
    ).toEqual(['NEXO', 'Pessoas e convites'])
    const team = routes.find(({ path }) => path === '/team')!
    expect(routeAllowed(team, new Set(['team.read']))).toBe(true)
    expect(routeAllowed(team, new Set())).toBe(false)
  })

  it('supports translation namespaces, interpolation and pluralization', () => {
    expect(translationNamespaces).toContain('nav')
    expect(t('common.plannedPhase', { phase: 5 })).toBe(
      'Planejado para a Fase 5',
    )
    expect(plural(1, { one: '{count} equipe', other: '{count} equipes' })).toBe(
      '1 equipe',
    )
    expect(plural(2, { one: '{count} equipe', other: '{count} equipes' })).toBe(
      '2 equipes',
    )
  })

  it('centralizes timezone and locale-aware formatting', () => {
    expect(resolveTimezone({ organizationTimezone: 'America/Sao_Paulo' })).toBe(
      'America/Sao_Paulo',
    )
    expect(
      formatDateTime('2026-07-16T15:00:00.000Z', {
        organizationTimezone: 'America/Sao_Paulo',
      }),
    ).toContain('12:00')
    expect(formatCurrency(1234.5)).toContain('1.234,50')
  })

  it('resolves system theme and rejects unrecognized preferences', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('purple')).toBe(false)
  })

  it('partitions cache by organization and invalidates rejected reads', async () => {
    const cache = new TenantQueryCache()
    const first = vi.fn().mockResolvedValue('tenant-a')
    const second = vi.fn().mockResolvedValue('tenant-b')
    expect(
      await cache.getOrCreate(
        { kind: 'organization', id: 'a' },
        'members',
        first,
      ),
    ).toBe('tenant-a')
    expect(
      await cache.getOrCreate(
        { kind: 'organization', id: 'b' },
        'members',
        second,
      ),
    ).toBe('tenant-b')
    await cache.getOrCreate({ kind: 'organization', id: 'a' }, 'members', first)
    expect(first).toHaveBeenCalledOnce()
    cache.clearOrganization('a')
    await cache.getOrCreate({ kind: 'organization', id: 'a' }, 'members', first)
    expect(first).toHaveBeenCalledTimes(2)
    const rejected = vi.fn().mockRejectedValue(new Error('network'))
    await expect(
      cache.getOrCreate({ kind: 'global' }, 'failure', rejected),
    ).rejects.toThrow('network')
    await expect(
      cache.getOrCreate({ kind: 'global' }, 'failure', rejected),
    ).rejects.toThrow('network')
    expect(rejected).toHaveBeenCalledTimes(2)
  })
})
