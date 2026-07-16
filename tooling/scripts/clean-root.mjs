import { rm } from 'node:fs/promises'

await Promise.all(
  ['.turbo', 'coverage', 'playwright-report', 'test-results'].map(
    async (path) => rm(path, { force: true, recursive: true }),
  ),
)
