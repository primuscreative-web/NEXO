import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/visual',
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  expect: {
    toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.025 },
  },
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    colorScheme: 'light',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'pnpm --filter @nexo/web start --port 3000',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: { ...process.env, NODE_ENV: 'test' },
  },
})
