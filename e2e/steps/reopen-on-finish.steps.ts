import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './program-fixtures.js'
import { settledBox } from './touch-target.js'

const { Given, When, Then } = createBdd(test)

const MAX_SETS = 20
// Longer than the double-tap guard of the UI, which reads the real clock here.
const BETWEEN_TAPS_MS = 1000

function nextButton(page: Page) {
  return page.getByRole('button', { name: 'Próximo' })
}

function finishedHeading(page: Page) {
  return page.getByRole('heading', { name: 'Treino concluído' })
}

function reopening(page: Page) {
  return page.getByRole('region', { name: 'Janelas reabrem' })
}

// The API and the app both read the real clock, so the workout is not played on a fixed time.
Given(
  'the athlete started the day {string} on the real clock',
  async ({ page }, letter: string) => {
    await page.goto('/')
    await page.getByRole('button', { name: new RegExp(`^${letter}(\\s|$)`) }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Começar' }).click()
    await expect(nextButton(page)).toBeVisible()
  },
)

When('the athlete records every set skipping the rests', async ({ page }) => {
  for (let tap = 0; tap < MAX_SETS && !(await finishedHeading(page).isVisible()); tap += 1) {
    await nextButton(page).click()
    await page.waitForTimeout(BETWEEN_TAPS_MS)
  }
  await expect(finishedHeading(page)).toBeVisible()
})

Given('the athlete skips {string} in the sequence', async ({ page }, name: string) => {
  await page.getByRole('button', { name: /^Sequência do treino/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: `Pular ${name}` }).click()
  await expect(dialog).toHaveCount(0)
})

Then(
  'the finished workout should show the reopening of {string}',
  async ({ page }, groups: string) => {
    const rows = reopening(page).getByRole('img')
    const expected = groups.split(', ')

    await expect(rows).toHaveCount(expected.length)
    for (const [index, group] of expected.entries()) {
      await expect(rows.nth(index)).toHaveAttribute(
        'aria-label',
        new RegExp(`^${group}, abre .+ às \\d{1,2}h(\\d{2})?$`),
      )
    }
  },
)

Then('the finished workout should not show the reopening', async ({ page }) => {
  await expect(finishedHeading(page)).toBeVisible()
  // The send queue holds the sets, so the section has no answer to wait for.
  await page.waitForTimeout(BETWEEN_TAPS_MS)
  await expect(reopening(page)).toHaveCount(0)
})

Then('the button {string} should be inside the visible area', async ({ page }, name: string) => {
  const box = await settledBox(page.getByRole('button', { name }))
  const viewportHeight = await page.evaluate(() => window.innerHeight)

  expect(box && box.y >= 0 && box.y + box.height <= viewportHeight).toBe(true)
})

Then(
  'the button {string} should be visible below the reopening',
  async ({ page }, name: string) => {
    await expect(reopening(page)).toBeVisible()
    const section = await settledBox(reopening(page))
    const button = await settledBox(page.getByRole('button', { name }))
    const viewportHeight = await page.evaluate(() => window.innerHeight)

    expect({
      below: Boolean(section && button && button.y >= section.y + section.height),
      inside: Boolean(button && button.y + button.height <= viewportHeight),
    }).toEqual({ below: true, inside: true })
  },
)

When('the athlete records one set and ends the workout', async ({ page }) => {
  await nextButton(page).click()
  await page.waitForTimeout(BETWEEN_TAPS_MS)
  await page.getByRole('button', { name: /^Sequência do treino/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Encerrar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Encerrar' }).click()
})

// An ended workout goes back to the letters, whose windows show the reopening.
Then(
  'the day {string} in the letters should show only {string}',
  async ({ page }, letter: string, badge: string) => {
    const items = page
      .getByRole('button', { name: new RegExp(`^${letter}(\\s|$)`) })
      .getByRole('listitem')

    await expect(items).toHaveCount(1)
    await expect(items.first()).toHaveText(new RegExp(`^${badge}`))
  },
)
