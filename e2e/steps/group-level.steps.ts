import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './program-fixtures.js'

const { Given, When, Then } = createBdd(test)

// Longer than the double-tap guard of the UI, which reads the real clock here.
const BETWEEN_TAPS_MS = 1000

function levelBar(page: Page, group: string) {
  return page.getByRole('progressbar', { name: `Nível de ${group}` })
}

Given('the phone asks for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

// The second tap of each pair skips the rest, so the next set shows at once.
When('the athlete records {int} sets skipping the rest', async ({ page }, count: number) => {
  const next = page.getByRole('button', { name: 'Próximo' })
  for (let set = 1; set <= count; set += 1) {
    if (set > 1) {
      await next.click()
      await page.waitForTimeout(BETWEEN_TAPS_MS)
    }
    await next.click()
    await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible()
    if (set < count) await page.waitForTimeout(BETWEEN_TAPS_MS)
  }
})

Then(
  'the level bar of {string} should read {string}',
  async ({ page }, group: string, text: string) => {
    await expect(levelBar(page, group)).toHaveAttribute('aria-valuetext', text)
  },
)

Then(
  'the silver seal of level {int} should show in full screen and leave by itself',
  async ({ page }, level: number) => {
    const celebration = page.locator('[data-level-celebration]')
    await expect(celebration).toContainText(`Nível ${level}`)
    await expect(celebration.locator('[data-tier]')).toHaveAttribute('data-tier', 'silver')
    // The layout box, without the scale of the entrance: the whole screen.
    const coversScreen = await celebration.evaluate(
      (element) =>
        element instanceof HTMLElement &&
        element.offsetWidth >= window.innerWidth &&
        element.offsetHeight >= window.innerHeight,
    )
    expect(coversScreen).toBe(true)
    await expect(celebration).toHaveCount(0, { timeout: 3000 })
  },
)

Then('the level bar of {string} should fill with no animation', async ({ page }, group: string) => {
  const fill = levelBar(page, group).locator('[data-level-fill]')
  await expect(fill).toBeVisible()
  expect(await fill.evaluate((element) => getComputedStyle(element).transitionProperty)).toBe(
    'none',
  )
})
