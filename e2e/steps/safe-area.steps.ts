import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './program-fixtures.js'

const { Given, Then } = createBdd(test)

// Playwright cannot emulate env(safe-area-inset-*), so body padding stands in for the insets.
Given(
  'the device has safe-area insets of {int} px at the top and {int} px at the bottom',
  async ({ page }, topPx: number, bottomPx: number) => {
    await page.addInitScript(
      ({ top, bottom }) => {
        const style = document.createElement('style')
        style.textContent = `body { padding-top: ${top}px !important; padding-bottom: ${bottom}px !important; }`
        document.addEventListener('DOMContentLoaded', () => document.head.append(style))
      },
      { top: topPx, bottom: bottomPx },
    )
  },
)

Then('the rest screen should be visible', async ({ page }) => {
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible()
})

Then('the page should not scroll', async ({ page }) => {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const scroller = document.scrollingElement
        return (scroller?.scrollHeight ?? 0) - window.innerHeight
      }),
    )
    .toBeLessThanOrEqual(0)
})
