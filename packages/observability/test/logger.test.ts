import { describe, expect, it } from 'vitest'
import { createLogger, currentTraceContext } from '../src/index.js'

describe('createLogger', () => {
  it('creates a service-scoped structured logger', () => {
    const logger = createLogger({ level: 'silent', service: 'test' })
    expect(logger.level).toBe('silent')
  })

  it('omits correlation fields when there is no active trace', () => {
    expect(currentTraceContext()).toEqual({})
  })
})
