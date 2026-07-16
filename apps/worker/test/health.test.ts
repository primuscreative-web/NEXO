import { describe, expect, it } from 'vitest'
import { HealthController } from '../src/health.controller.js'
describe('worker health controller', () => {
  it('reports readiness', () => {
    expect(new HealthController().ready()).toMatchObject({
      service: 'worker',
      status: 'ok',
    })
  })
})
