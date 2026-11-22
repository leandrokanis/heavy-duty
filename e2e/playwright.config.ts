import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'
import { API_DATA_DIR, API_DATABASE_PATH } from './steps/api-server.js'
import { API_BASE_URL, API_PORT, APP_BASE_URL, APP_PORT } from './steps/catalog-api.js'

const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3102)
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`
// WebAuthn rejects an IP address as RP ID, so the browser uses localhost (ADR-019).
const baseURL = APP_BASE_URL

// A fresh database per run keeps the catalog scenarios repeatable.
const apiDataDir = API_DATA_DIR
const apiDatabasePath = API_DATABASE_PATH

const CATALOG_MUSCLES_SPEC = /catalog-muscles\.feature\.spec\.js$/
const PROGRAMS_SPEC = /programs\.feature\.spec\.js$/
const PROGRAMS_EDIT_SPEC = /programs-edit\.feature\.spec\.js$/
const TODAY_WORKOUT_SPEC = /today-workout\.feature\.spec\.js$/
const ONE_TAP_SET_SPEC = /one-tap-set\.feature\.spec\.js$/
const REST_TIMER_SPEC = /rest-timer\.feature\.spec\.js$/
const OFFLINE_SETS_SPEC = /offline-sets\.feature\.spec\.js$/
const WORKOUT_SEQUENCE_SPEC = /workout-sequence\.feature\.spec\.js$/
const SKIP_EXERCISE_SPEC = /skip-exercise\.feature\.spec\.js$/
const REVIEW_DONE_EXERCISE_SPEC = /review-done-exercise\.feature\.spec\.js$/
const TIMED_EXERCISE_SPEC = /timed-exercise\.feature\.spec\.js$/
const DRAG_ADJUST_SPEC = /drag-adjust\.feature\.spec\.js$/
const CORRECT_LAST_SET_SPEC = /correct-last-set\.feature\.spec\.js$/
const LIST_WORKOUTS_SPEC = /list-workouts\.feature\.spec\.js$/

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  // The fixtures file must be listed so bddgen can find the shared custom test.
  steps: ['steps/**/*.steps.ts', 'steps/**/*-fixtures.ts'],
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
    // The muscle scenarios expect a fresh catalog; the exercise scenarios then reuse
    // those muscles in the same database, so the muscle scenarios run first.
    {
      name: 'catalog-muscles',
      testMatch: CATALOG_MUSCLES_SPEC,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile',
      testIgnore: [
        CATALOG_MUSCLES_SPEC,
        PROGRAMS_SPEC,
        PROGRAMS_EDIT_SPEC,
        TODAY_WORKOUT_SPEC,
        ONE_TAP_SET_SPEC,
        REST_TIMER_SPEC,
        OFFLINE_SETS_SPEC,
        WORKOUT_SEQUENCE_SPEC,
        SKIP_EXERCISE_SPEC,
        REVIEW_DONE_EXERCISE_SPEC,
        TIMED_EXERCISE_SPEC,
        DRAG_ADJUST_SPEC,
        CORRECT_LAST_SET_SPEC,
        LIST_WORKOUTS_SPEC,
      ],
      dependencies: ['catalog-muscles'],
      use: { ...devices['Pixel 7'] },
    },
    // Program scenarios change the single active program, so they run one at a time, and
    // after the exercise scenarios that expect a 201 for the exercises they register.
    {
      name: 'programs',
      testMatch: PROGRAMS_SPEC,
      fullyParallel: false,
      dependencies: ['mobile'],
      use: { ...devices['Pixel 7'] },
    },
    // A project of its own keeps the edit scenarios off the active program while the
    // creation scenarios run: fullyParallel false still runs two files side by side.
    {
      name: 'programs-edit',
      testMatch: PROGRAMS_EDIT_SPEC,
      fullyParallel: false,
      dependencies: ['programs'],
      use: { ...devices['Pixel 7'] },
    },
    // Runs alone: it clears the fixture workouts and deactivates the programs.
    {
      name: 'today-workout',
      testMatch: TODAY_WORKOUT_SPEC,
      fullyParallel: false,
      dependencies: ['programs-edit'],
      use: { ...devices['Pixel 7'] },
    },
    // Records sets in the shared database and clears the workouts, so it runs after the
    // workout of the day and one scenario at a time; each scenario creates its own program.
    {
      name: 'one-tap-set',
      testMatch: ONE_TAP_SET_SPEC,
      fullyParallel: false,
      dependencies: ['today-workout'],
      use: { ...devices['Pixel 7'] },
    },
    // Also records sets and clears the workouts, with its own active program per scenario.
    {
      name: 'rest-timer',
      testMatch: REST_TIMER_SPEC,
      fullyParallel: false,
      dependencies: ['one-tap-set'],
      use: { ...devices['Pixel 7'] },
    },
    // Records sets, clears the workouts and reads the only workout in the database, so it runs
    // alone and one scenario at a time, after the rest timer.
    {
      name: 'offline-sets',
      testMatch: OFFLINE_SETS_SPEC,
      fullyParallel: false,
      dependencies: ['rest-timer'],
      use: { ...devices['Pixel 7'] },
    },
    // Records sets, ends workouts and reads their end in the shared database, so it runs alone
    // and one scenario at a time, after the offline sets.
    {
      name: 'workout-sequence',
      testMatch: WORKOUT_SEQUENCE_SPEC,
      fullyParallel: false,
      dependencies: ['offline-sets'],
      use: { ...devices['Pixel 7'] },
    },
    // Records sets, skips exercises and reads the skips in the shared database, so it runs alone
    // and one scenario at a time, after the workout sequence.
    {
      name: 'skip-exercise',
      testMatch: SKIP_EXERCISE_SPEC,
      fullyParallel: false,
      dependencies: ['workout-sequence'],
      use: { ...devices['Pixel 7'] },
    },
    // Records sets and reads the sheet of the sequence in the shared database, so it runs alone
    // and one scenario at a time, after the skipped exercise.
    {
      name: 'review-done-exercise',
      testMatch: REVIEW_DONE_EXERCISE_SPEC,
      fullyParallel: false,
      dependencies: ['skip-exercise'],
      use: { ...devices['Pixel 7'] },
    },
    // Records timed sets from the clock and reads them in the shared database, so it runs alone
    // and one scenario at a time, after the review of the done exercise.
    {
      name: 'timed-exercise',
      testMatch: TIMED_EXERCISE_SPEC,
      fullyParallel: false,
      dependencies: ['review-done-exercise'],
      use: { ...devices['Pixel 7'] },
    },
    // Records sets from adjusted values and reads them in the shared database, so it runs alone
    // and one scenario at a time, after the timed exercise.
    {
      name: 'drag-adjust',
      testMatch: DRAG_ADJUST_SPEC,
      fullyParallel: false,
      dependencies: ['timed-exercise'],
      use: { ...devices['Pixel 7'] },
    },
    // Records sets, corrects the last one and reads it in the shared database, so it runs alone
    // and one scenario at a time, after the drag adjust.
    {
      name: 'correct-last-set',
      testMatch: CORRECT_LAST_SET_SPEC,
      fullyParallel: false,
      dependencies: ['drag-adjust'],
      use: { ...devices['Pixel 7'] },
    },
    // Records workouts in a fixed week of 2025 and reads them back through the MCP, so it runs
    // alone and one scenario at a time, after the correction of the last set.
    {
      name: 'list-workouts',
      testMatch: LIST_WORKOUTS_SPEC,
      fullyParallel: false,
      dependencies: ['correct-last-set'],
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: [
    // The PWA only exists in the production build (ADR-009): Serwist is off in next dev.
    {
      command: `pnpm --filter @heavy-duty/ui build && pnpm --filter @heavy-duty/ui exec next start --hostname 127.0.0.1 --port ${WEB_PORT}`,
      url: WEB_URL,
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
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        DATABASE_PATH: apiDatabasePath,
        APP_ORIGIN: APP_BASE_URL,
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    // Same path routing as the Caddyfile: /api/* and /mcp* to the API, the rest to the app.
    {
      command: 'node support/proxy.ts',
      url: `http://127.0.0.1:${APP_PORT}/api/health`,
      env: { PROXY_PORT: String(APP_PORT), WEB_PORT: String(WEB_PORT), API_PORT: String(API_PORT) },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
})
