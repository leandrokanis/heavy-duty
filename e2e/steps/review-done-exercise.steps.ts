import { expect, type Page } from '@playwright/test'
import { createBdd, type DataTable } from 'playwright-bdd'
import { test } from './program-fixtures.js'
import { recordThreeSets } from './workout-helpers.js'

const { Given, When, Then } = createBdd(test)

const SCREEN_WIDTH_PX = 412

function dialogOf(page: Page) {
  return page.getByRole('dialog')
}

function exerciseList(page: Page) {
  return dialogOf(page).getByRole('list', { name: 'Exercícios' })
}

Given(
  'the athlete recorded the 3 sets of the exercise on screen from {string}',
  async ({ page, program }, firstTapAt: string) => {
    await recordThreeSets(page, program, firstTapAt)
  },
)

Given('the screen is {int} px tall', async ({ page }, heightPx: number) => {
  await page.setViewportSize({ width: SCREEN_WIDTH_PX, height: heightPx })
})

Then('the list {string} should read:', async ({ page }, listName: string, table: DataTable) => {
  const sets = table.hashes().map((row) => `  - listitem: ${JSON.stringify(row.set)}`)
  await expect(dialogOf(page).getByRole('list', { name: listName })).toMatchAriaSnapshot(
    [`- list ${JSON.stringify(listName)}:`, ...sets].join('\n'),
  )
})

Then('the figures in the list {string} should be tabular', async ({ page }, listName: string) => {
  const sets = dialogOf(page).getByRole('list', { name: listName })
  const variants = await sets
    .locator('[aria-hidden="true"] span')
    .evaluateAll((spans) =>
      spans
        .filter((span) => span.children.length === 0 && /^[\d,]+$/.test(span.textContent ?? ''))
        .map((span) => getComputedStyle(span).fontVariantNumeric),
    )
  expect(variants.length).toBeGreaterThan(0)
  for (const variant of variants) expect(variant).toContain('tabular-nums')
})

Then(
  'the title {string} and the buttons {string} and {string} should be in the viewport',
  async ({ page }, title: string, close: string, end: string) => {
    await expect(dialogOf(page).getByText(title, { exact: true })).toBeInViewport({ ratio: 1 })
    await expect(dialogOf(page).getByRole('button', { name: close })).toBeInViewport({ ratio: 1 })
    await expect(dialogOf(page).getByRole('button', { name: end })).toBeInViewport({ ratio: 1 })
  },
)

Then('the list of exercises should scroll inside the sheet', async ({ page }) => {
  const list = await exerciseList(page).evaluate((element) => ({
    scrolls: element.scrollHeight > element.clientHeight,
    overflowY: getComputedStyle(element).overflowY,
    overscroll: getComputedStyle(element).overscrollBehaviorY,
  }))
  expect(list).toEqual({ scrolls: true, overflowY: 'auto', overscroll: 'contain' })
})

const pageScrollBefore = new WeakMap<Page, number>()

When('the athlete scrolls the list of exercises to the end', async ({ page }) => {
  pageScrollBefore.set(page, await page.evaluate(() => window.scrollY))
  await exerciseList(page).evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
})

Then('the page behind the sheet should not have scrolled', async ({ page }) => {
  expect(await page.evaluate(() => window.scrollY)).toBe(pageScrollBefore.get(page))
})

Then('the row of {string} should be in the viewport', async ({ page }, name: string) => {
  await expect(
    exerciseList(page).getByRole('listitem').filter({ hasText: name }).first(),
  ).toBeInViewport({ ratio: 1 })
})
