import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { API_DATABASE_PATH } from './api-server.js'
import { test } from './group-window-fixtures.js'

const { Given, When, Then } = createBdd(test)

function withDatabase(action: (db: DatabaseSync) => void): void {
  const db = new DatabaseSync(API_DATABASE_PATH)
  try {
    db.exec('PRAGMA busy_timeout = 5000')
    action(db)
  } finally {
    db.close()
  }
}

function shelf(page: Page) {
  return page.getByRole('list', { name: 'Medalhas' })
}

// biome-ignore lint/correctness/noEmptyPattern: playwright-bdd requires a destructured first argument.
Given('no medal is awarded', ({}) => {
  withDatabase((db) => db.exec('DELETE FROM medal_awards'))
})

// The award as the API stores it (ADR-040); the history no longer has to reach the level.
Given(
  'the athlete conquered the medal {string} in {string}',
  // biome-ignore lint/correctness/noEmptyPattern: playwright-bdd requires a destructured first argument.
  ({}, code: string, groupSlug: string) => {
    withDatabase((db) => {
      db.prepare(
        'INSERT INTO medal_awards (id, medal_code, subject, workout_id, awarded_at) VALUES (?, ?, ?, NULL, ?)',
      ).run(randomUUID(), code, groupSlug, new Date(Date.now() - 60 * 60 * 1000).toISOString())
    })
  },
)

When('the athlete records the set', async ({ page }) => {
  await page.getByRole('button', { name: 'Próximo' }).click()
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible()
})

// The toast is only visual; the live region of the workout screen announces the medal.
Then(
  'the medal {string} should drop from the top of the screen',
  async ({ page }, name: string) => {
    await expect(page.getByText('Medalha nova', { exact: true })).toBeVisible()
    await expect(page.getByText(name, { exact: true })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: `Medalha nova: ${name}` })).toHaveCount(
      1,
    )
  },
)

Then('the shelf of medals should show {string}', async ({ page }, label: string) => {
  if (!page.url().endsWith('/periodo')) {
    await page.goto('/periodo')
  }
  await expect(shelf(page).getByRole('listitem', { name: label })).toBeVisible()
})

Then(
  'the shelf of medals should show {int} hidden medals with no name and no criterion',
  async ({ page }, count: number) => {
    const hidden = shelf(page).getByRole('listitem', { name: 'Medalha oculta' })
    await expect(hidden).toHaveCount(count)
    for (const item of await hidden.all()) {
      await expect(item).toHaveText('???')
    }
  },
)

Then('the level of {string} should be below 10', async ({ page }, group: string) => {
  const levels = page.getByRole('list', { name: 'Níveis' })
  await expect(levels.getByText(new RegExp(`^${group}, nível [1-9]$`))).toBeVisible()
})
