import { expect, type Page } from '@playwright/test'
import { createBdd, type DataTable } from 'playwright-bdd'
import { test } from './group-window-fixtures.js'

const { When, Then } = createBdd(test)

const STATE_TEXTS = ['Janela aberta', 'Descansando', 'Esfriando', 'Sem treino', 'Fora do programa']

function groupRows(page: Page) {
  return page.getByRole('list', { name: 'Grupos musculares' }).getByRole('button')
}

function figurePart(page: Page, slug: string) {
  return page.locator(`svg [data-group="${slug}"]`)
}

When('the athlete opens the body map from the workout of the day', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Mapa' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Mapa' })).toBeVisible()
  await expect(groupRows(page)).toHaveCount(11)
})

When('the athlete taps {string} on the figure', async ({ page }, slug: string) => {
  await figurePart(page, slug).first().click()
})

Then('the body map should show these groups:', async ({ page }, table: DataTable) => {
  for (const { group, state } of table.hashes()) {
    await expect(groupRows(page).filter({ hasText: group ?? '' })).toHaveAttribute(
      'aria-label',
      new RegExp(`^${group}, ${state}`),
    )
  }
})

Then(
  'the figure should mark {string} as {string}, {string} as {string} and {string} as {string}',
  async (
    { page },
    firstSlug: string,
    firstState: string,
    secondSlug: string,
    secondState: string,
    thirdSlug: string,
    thirdState: string,
  ) => {
    for (const [slug, state] of [
      [firstSlug, firstState],
      [secondSlug, secondState],
      [thirdSlug, thirdState],
    ] as const) {
      await expect(figurePart(page, slug).first()).toHaveAttribute('data-state', state)
    }
  },
)

Then('every part of {string} on the figure should be hatched', async ({ page }, slug: string) => {
  const fills = await figurePart(page, slug).evaluateAll((parts) =>
    parts.map((part) => part.getAttribute('fill') ?? ''),
  )
  expect(fills.length).toBeGreaterThan(0)
  for (const fill of fills) expect(fill).toMatch(/^url\(#/)
})

Then('every group of the body map should say its state in text', async ({ page }) => {
  const rows = groupRows(page)
  for (let index = 0; index < 11; index += 1) {
    const text = (await rows.nth(index).textContent()) ?? ''
    expect(STATE_TEXTS.some((state) => text.includes(state))).toBe(true)
  }
})

Then(
  'the detail of {string} should show the level, the progress bar, the best level and the time of the window',
  async ({ page }, group: string) => {
    const dialog = page.getByRole('dialog', { name: group })
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole('progressbar', { name: `Nível de ${group.toLowerCase()}` }),
    ).toHaveAttribute('aria-valuetext', /^Nível \d+, \d+ de \d+ pontos$/)
    await expect(dialog.getByRole('term').filter({ hasText: 'Melhor nível' })).toBeVisible()
    await expect(dialog.getByRole('definition').filter({ hasText: /^Fecha / })).toBeVisible()
  },
)
