// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { badgeVariants } from '../src/display'
import { buttonVariants } from '../src/button'
import { initials } from '../src/lib'

describe('typed variants', () => {
  it('composes button states deterministically', () => {
    expect(
      buttonVariants({ variant: 'destructive', size: 'lg', block: true }),
    ).toContain('nexo-button--destructive')
  })

  it('composes semantic badge tones', () => {
    expect(badgeVariants({ tone: 'success' })).toContain('nexo-badge--success')
  })

  it('creates accessible avatar initials', () => {
    expect(initials('  Ana Maria Silva ')).toBe('AM')
  })
})
