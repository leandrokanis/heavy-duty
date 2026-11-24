import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './program-fixtures.js'
import { countWorkouts } from './workout-fixtures.js'

const { When, Then } = createBdd(test)

When('the athlete opens the history page', async ({ page }) => {
  await page.goto('/historico')
})

When('the athlete taps {string} in the confirmation', async ({ page }, name: string) => {
  await page.getByRole('alertdialog').getByRole('button', { name, exact: true }).click()
})

Then(
  'the confirmation {string} should read {string}',
  async ({ page }, title: string, text: string) => {
    const dialog = page.getByRole('alertdialog', { name: title })
    await expect(dialog.getByText(text, { exact: true })).toBeVisible()
  },
)

// biome-ignore lint/correctness/noEmptyPattern: playwright-bdd requires a destructured first argument.
Then('the server should still hold {int} workout', ({}, count: number) => {
  expect(countWorkouts()).toBe(count)
})

Then('the screen should show the heading {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
})

Then('the screen should not offer {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name })).toHaveCount(0)
})
