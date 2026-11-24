import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './program-fixtures.js'

const { Given, Then } = createBdd(test)

declare global {
  interface Window {
    playedTones?: number
  }
}

// Counts the oscillators the app starts, so a scenario can tell that no sound played.
Given('the app counts the sounds it plays', async ({ page }) => {
  await page.addInitScript(() => {
    window.playedTones = 0
    const start = OscillatorNode.prototype.start
    OscillatorNode.prototype.start = function (this: OscillatorNode, ...args) {
      window.playedTones = (window.playedTones ?? 0) + 1
      return start.apply(this, args)
    }
  })
})

Given('the athlete turns the game sound off in the sequence', async ({ page }) => {
  await page.getByRole('button', { name: /^Sequência do treino/ }).click()
  const dialog = page.getByRole('dialog')
  const sound = dialog.getByRole('button', { name: 'Som do jogo' })
  await sound.click()
  await expect(sound).toHaveAttribute('aria-pressed', 'false')
  await dialog.getByRole('button', { name: 'Fechar' }).click()
  await expect(dialog).toHaveCount(0)
})

// The points are decorative and hidden from the screen reader; the live region speaks them.
function pointsOf(page: Page, points: string) {
  return page.locator('[data-points]', { hasText: points })
}

async function expectAboveNext(page: Page, points: string) {
  const float = pointsOf(page, points)
  await expect(float).toHaveAttribute('aria-hidden', 'true')
  // The rise starts below its place; its last frame is where the points rest above the button.
  await float.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  )
  const floatBox = await float.boundingBox()
  const nextBox = await page.getByRole('button', { name: 'Próximo' }).boundingBox()
  expect(floatBox && nextBox && floatBox.y + floatBox.height <= nextBox.y).toBe(true)
}

Then('{string} should rise from {string}', async ({ page }, points: string, _button: string) => {
  await expectAboveNext(page, points)
  await expect(pointsOf(page, points)).not.toContainText('×2')
})

Then(
  '{string} should rise from {string} with the mark {string}',
  async ({ page }, points: string, _button: string, mark: string) => {
    await expectAboveNext(page, points)
    await expect(pointsOf(page, points)).toContainText(mark)
  },
)

Then('the screen should announce {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('status').filter({ hasText: text })).toHaveText(text)
})

Then('no sound should play', async ({ page }) => {
  expect(await page.evaluate(() => window.playedTones)).toBe(0)
})

Then('the points sound should play', async ({ page }) => {
  await expect.poll(() => page.evaluate(() => window.playedTones)).toBeGreaterThan(0)
})
