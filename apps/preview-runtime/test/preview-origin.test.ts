import { describe, expect, it } from 'vitest'
import {
  isAllowedPreviewOrigin,
  isVercelNexoPreviewOrigin,
} from '../src/preview-origin.js'

describe('Preview origin allowlist', () => {
  const configured = ['https://nexo-web-preview.vercel.app']

  it('allows the exact configured stable origin', () => {
    expect(isAllowedPreviewOrigin(configured[0], configured)).toBe(true)
  })

  it('allows only generated deployments from the official NEXO project', () => {
    expect(
      isVercelNexoPreviewOrigin(
        'https://nexo-685ujrpkf-primuscreative-webs-projects.vercel.app',
      ),
    ).toBe(true)
    expect(
      isVercelNexoPreviewOrigin(
        'https://another-685ujrpkf-primuscreative-webs-projects.vercel.app',
      ),
    ).toBe(false)
  })

  it.each([
    'https://attacker.example',
    'http://nexo-test-primuscreative-webs-projects.vercel.app',
    'not-a-url',
  ])('rejects untrusted or invalid origin %s', (origin) => {
    expect(isAllowedPreviewOrigin(origin, configured)).toBe(false)
  })

  it('does not turn requests without Origin into browser CORS access', () => {
    expect(isAllowedPreviewOrigin(undefined, configured)).toBe(false)
  })
})
