import { describe, expect, it } from 'vitest'
import {
  parseInfrastructureEnvironment,
  parsePort,
  parseServiceEnvironment,
} from '../src/index.js'

describe('service environment', () => {
  it('applies safe local defaults', () => {
    expect(parseServiceEnvironment({})).toMatchObject({
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
    })
  })

  it('rejects ports outside the TCP range', () => {
    expect(() => parsePort('70000', 3000)).toThrow()
  })

  it('does not require managed infrastructure for local liveness', () => {
    expect(parseInfrastructureEnvironment({})).toEqual({
      STORAGE_PROVIDER: 's3-compatible',
      STORAGE_REGION: 'auto',
    })
  })
})
