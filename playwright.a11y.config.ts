import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/a11y',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm --filter @nexo/web start --port 3000',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: { ...process.env, NODE_ENV: 'test' },
  },
})
