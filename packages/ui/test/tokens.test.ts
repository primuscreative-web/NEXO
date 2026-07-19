// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8')

describe('semantic tokens', () => {
  it('defines equivalent light and dark semantic contracts', () => {
    const required = [
      '--nexo-background',
      '--nexo-surface',
      '--nexo-surface-elevated',
      '--nexo-foreground',
      '--nexo-border',
      '--nexo-primary',
      '--nexo-success',
      '--nexo-warning',
      '--nexo-danger',
      '--nexo-info',
      '--nexo-ai',
      '--nexo-focus',
      '--nexo-overlay',
    ]
    for (const token of required)
      expect(css.match(new RegExp(`${token}:`, 'gu'))).toHaveLength(2)
  })

  it('includes motion, layout, type and component aliases', () => {
    expect(css).toContain('--nexo-duration-normal')
    expect(css).toContain('--nexo-sidebar-expanded')
    expect(css).toContain('--nexo-font-heading')
    expect(css).toContain('--nexo-control-height-md')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
