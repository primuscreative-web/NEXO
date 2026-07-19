import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup-components.ts'],
    include: ['test/**/*.component.test.tsx'],
  },
})
