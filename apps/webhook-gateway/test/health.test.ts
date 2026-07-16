import { describe, expect, it } from 'vitest'
import { HealthController } from '../src/health.controller.js'
describe('webhook gateway health controller', () => {
  it('reports liveness', () => {
    expect(new HealthController().live()).toMatchObject({
      service: 'webhook-gateway',
      status: 'ok',
    })
  })
})
