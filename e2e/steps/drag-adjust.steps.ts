import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './program-fixtures.js'
import { expectWheel } from './workout-helpers.js'

const { Given, When, Then } = createBdd(test)

// The distance of one step of the wheel, as in workout.config.ts (DRAG_STEP_PX).
const DRAG_STEP_PX = 22
const MOVES_PER_STEP = 2

Given('the athlete is on the exercise {string}', async ({ page }, name: string) => {
  if ((await page.getByRole('heading', { level: 1 }).textContent()) === name) return
  await page.getByRole('button', { name: /^Sequência do treino/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: new RegExp(`^${name}`) }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
})

// Down raises the value: the larger value sits above, so the finger pulls it down.
async function dragWheel(page: Page, name: string, steps: number, direction: string) {
  const box = await page.getByRole('spinbutton', { name }).boundingBox()
  if (!box) throw new Error(`The wheel ${name} is not on screen`)
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const sign = direction === 'down' ? 1 : -1
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let move = 1; move <= steps * MOVES_PER_STEP; move += 1) {
    await page.mouse.move(x, y + (sign * move * DRAG_STEP_PX) / MOVES_PER_STEP)
  }
  await page.mouse.up()
}

When(
  'the athlete drags the wheel {string} {int} steps {word}',
  async ({ page }, name: string, steps: number, direction: string) => {
    await dragWheel(page, name, steps, direction)
  },
)

Then('the wheel {string} shows {string}', async ({ page }, name: string, value: string) => {
  await expectWheel(page, name, value)
})
