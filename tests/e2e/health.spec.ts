import { expect, test } from '@playwright/test'

const endpoints = [
  ['web', 'http://127.0.0.1:3000/health'],
  ['api', 'http://127.0.0.1:3001/health/live'],
  ['worker', 'http://127.0.0.1:3002/health/live'],
  ['webhook-gateway', 'http://127.0.0.1:3003/health/live'],
] as const

for (const [service, url] of endpoints) {
  test(`${service} exposes a healthy smoke endpoint`, async ({ request }) => {
    const response = await request.get(url)
    expect(response.ok()).toBe(true)
    await expect(response.json()).resolves.toMatchObject({
      service,
      status: 'ok',
    })
  })
}
