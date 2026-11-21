import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'
import { API_BASE_URL, API_PORT } from './steps/catalog-api.js'

const port = Number(process.env.E2E_PORT ?? 3100)
const baseURL = `http://127.0.0.1:${port}`

// A fresh database per run keeps the catalog scenarios repeatable.
const apiDataDir = fileURLToPath(new URL('./.data', import.meta.url))
const apiDatabasePath = `${apiDataDir}/heavy-duty.e2e.sqlite`

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'steps/**/*.steps.ts',
})

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: true,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: [
    // The PWA only exists in the production build (ADR-009): Serwist is off in next dev.
    {
      command: `pnpm --filter @heavy-duty/ui build && pnpm --filter @heavy-duty/ui exec next start --hostname 127.0.0.1 --port ${port}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 240_000,
    },
    {
      command: [
        `rm -rf "${apiDataDir}"`,
        'pnpm --filter @heavy-duty/api db:migrate',
        'pnpm --filter @heavy-duty/api db:seed',
        'pnpm --filter @heavy-duty/api exec tsx src/server.ts',
      ].join(' && '),
      url: `${API_BASE_URL}/api/health`,
      env: { NODE_ENV: 'test', PORT: String(API_PORT), DATABASE_PATH: apiDatabasePath },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
