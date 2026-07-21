import { describe, expect, it } from 'vitest'
import {
  assertPreviewRuntimeEnvironment,
  previewRuntimePort,
} from '../src/environment.js'

const validEnvironment: NodeJS.ProcessEnv = {
  DEPLOYMENT_ENV: 'preview',
  APP_ENV: 'preview',
  DATABASE_URL: 'postgresql://user:password@example.test:5432/nexo',
  REDIS_URL: 'rediss://default:password@example.test:6379',
  AUTH_JWT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----',
  AUTH_JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----',
  WEB_ORIGIN: 'https://nexo-web-preview.example.test',
}

describe('preview runtime environment', () => {
  it('accepts explicit preview configuration', () => {
    expect(() =>
      assertPreviewRuntimeEnvironment(validEnvironment),
    ).not.toThrow()
  })

  it('refuses non-preview deployments', () => {
    expect(() =>
      assertPreviewRuntimeEnvironment({
        ...validEnvironment,
        DEPLOYMENT_ENV: 'production',
      }),
    ).toThrow('DEPLOYMENT_ENV=preview')
  })

  it('uses the platform PORT for composed hosting', () => {
    expect(previewRuntimePort({ PORT: '4321', API_PORT: '3001' })).toBe(4321)
  })
})
