import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { API_DATA_DIR, API_DATABASE_PATH } from './api-server.js'
import { callMcpTool } from './catalog-api.js'
import { test } from './system-fixtures.js'

const { Given, When, Then } = createBdd(test)

const REPOSITORY_ROOT = fileURLToPath(new URL('../..', import.meta.url))

type BackupRunBody = { status: string; startedAt: string; error: string | null }

type SystemStatusResult = {
  result?: { structuredContent?: { backup: { latestRun: BackupRunBody | null } } }
}

Given('the daily backup failed', () => {
  const { RESTIC_PASSWORD_FILE: _file, ...inherited } = process.env
  // The repository folder does not exist, so the offsite copy fails with or without restic.
  const run = spawnSync('pnpm', ['--silent', '--filter', '@heavy-duty/api', 'backup:run'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    env: {
      ...inherited,
      NODE_ENV: 'test',
      DATABASE_PATH: API_DATABASE_PATH,
      RESTIC_REPOSITORY: `${API_DATA_DIR}/missing-restic-repository`,
      RESTIC_PASSWORD: 'insecure-dev-only-restic-password',
    },
  })

  expect(run.status).toBe(1)
})

When('the planner checks the app status through Claude', async ({ request, system }) => {
  system.statusResponse = await callMcpTool(request, 'get_system_status', {})
})

Then('the failure should show with its date and reason', async ({ system }) => {
  if (!system.statusResponse) throw new Error('The app status was not requested')
  const body = (await system.statusResponse.json()) as SystemStatusResult
  const latestRun = body.result?.structuredContent?.backup.latestRun

  expect({
    status: latestRun?.status,
    startedAtIsIso: latestRun
      ? new Date(latestRun.startedAt).toISOString() === latestRun.startedAt
      : false,
    hasReason: (latestRun?.error ?? '').length > 0,
  }).toEqual({ status: 'failed', startedAtIsIso: true, hasReason: true })
})
