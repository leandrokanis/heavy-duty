import { expect, type Page } from '@playwright/test'
import { createBdd, type DataTable } from 'playwright-bdd'
import { test } from './group-window-fixtures.js'
import { settledBox } from './touch-target.js'

const { When, Then } = createBdd(test)

const NARROW_WIDTH_PX = 320
const MIN_TOUCH_PX = 44

function letterButton(page: Page, letter: string) {
  return page.getByRole('button', { name: new RegExp(`^${letter}(\\s|$)`) })
}

When('the athlete opens the app on a 320 px wide screen', async ({ page }) => {
  await page.setViewportSize({ width: NARROW_WIDTH_PX, height: 700 })
  await page.goto('/')
})

Then(
  'the day {string} should show these windows:',
  async ({ page }, letter: string, table: DataTable) => {
    const expected = table.hashes().map((row) => row.window ?? '')
    const items = letterButton(page, letter).getByRole('listitem')

    await expect(items).toHaveCount(expected.length)
    for (const [index, text] of expected.entries()) {
      await expect(items.nth(index)).toHaveText(new RegExp(`^${text}`))
    }
  },
)

Then('the day {string} should show no windows', async ({ page }, letter: string) => {
  await expect(letterButton(page, letter)).toBeVisible()
  await expect(letterButton(page, letter).getByRole('listitem')).toHaveCount(0)
})

Then(
  'the day {string} should have a touch area of at least 44 px and no horizontal overflow',
  async ({ page }, letter: string) => {
    const row = letterButton(page, letter)
    await expect(row.getByRole('listitem')).toHaveCount(3)
    const box = await settledBox(row)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )

    expect({ tall: (box?.height ?? 0) >= MIN_TOUCH_PX, overflow }).toEqual({
      tall: true,
      overflow: 0,
    })
  },
)
