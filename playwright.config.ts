import { defineConfig } from '@playwright/test'

const env = {
  ...process.env,
  NODE_ENV: 'test',
  LOG_LEVEL: process.env.CI ? 'info' : 'silent',
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // These journeys intentionally mutate sessions, rate-limit buckets and tenant
  // state. Retrying an entire serial journey can hide the original failure and
  // create a different 429/duplicate-state error on the retry.
  retries: 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: { trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'pnpm --filter @nexo/web start --port 3000',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      env,
    },
    {
      command: 'pnpm --filter @nexo/api start',
      port: 3001,
      reuseExistingServer: true,
      env,
    },
    {
      command: 'pnpm --filter @nexo/worker start',
      port: 3002,
      reuseExistingServer: !process.env.CI,
      env,
    },
    {
      command: 'pnpm --filter @nexo/webhook-gateway start',
      port: 3003,
      reuseExistingServer: !process.env.CI,
      env,
    },
  ],
})
