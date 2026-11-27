import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { API_DATABASE_PATH } from './api-server.js'
import { test } from './group-window-fixtures.js'

const { Given, Then } = createBdd(test)

const DAY_MS = 24 * 60 * 60 * 1000
const PERIOD_MS = 84 * DAY_MS

// Period 1 is the one the API opened in the week of the run; starting it some days before now
// keeps the workouts recorded minutes ago inside it, even on a Monday morning.
// biome-ignore lint/correctness/noEmptyPattern: playwright-bdd requires a destructured first argument.
Given('the current period started {int} days ago', ({}, days: number) => {
  const startsAtMs = Date.now() - days * DAY_MS
  const db = new DatabaseSync(API_DATABASE_PATH)
  try {
    db.exec('PRAGMA busy_timeout = 5000')
    db.exec('DELETE FROM period_snapshots')
    db.exec('DELETE FROM periods')
    db.prepare(
      'INSERT INTO periods (id, number, starts_at, ends_at, intention, frozen_at) VALUES (?, 1, ?, ?, NULL, NULL)',
    ).run(
      randomUUID(),
      new Date(startsAtMs).toISOString(),
      new Date(startsAtMs + PERIOD_MS).toISOString(),
    )
  } finally {
    db.close()
  }
})

Then(
  'the finished workout should show {string} and {string}',
  async ({ page }, points: string, position: string) => {
    const summary = page.getByRole('region', { name: 'Pontos do treino' })
    await expect(summary).toContainText(points)
    await expect(summary.getByText(position)).toBeVisible()
  },
)

Then(
  'the ranking of the period should show {string}, {string} and {string} in this order',
  async ({ page }, first: string, second: string, third: string) => {
    const items = page.getByRole('list', { name: 'Ranking dos seus treinos' }).getByRole('listitem')
    await expect(items).toHaveCount(3)
    for (const [index, points] of [first, second, third].entries()) {
      await expect(items.nth(index)).toContainText(points)
    }
  },
)

Then('the game strip should show {string}', async ({ page }, name: string) => {
  await expect(
    page.getByRole('region', { name: 'Faixa de jogo' }).getByRole('img', { name }),
  ).toBeVisible()
})
