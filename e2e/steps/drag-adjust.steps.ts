import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './program-fixtures.js'
import { dragWheel, expectWheel } from './workout-helpers.js'

const { Given, When, Then } = createBdd(test)

Given('the athlete is on the exercise {string}', async ({ page }, name: string) => {
  if ((await page.getByRole('heading', { level: 1 }).textContent()) === name) return
  await page.getByRole('button', { name: /^Sequência do treino/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: new RegExp(`^${name}`) }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
})

When(
  'the athlete drags the wheel {string} {int} steps {word}',
  async ({ page }, name: string, steps: number, direction: string) => {
    await dragWheel(page.getByRole('spinbutton', { name }), steps, direction)
  },
)

Then('the wheel {string} shows {string}', async ({ page }, name: string, value: string) => {
  await expectWheel(page, name, value)
})
