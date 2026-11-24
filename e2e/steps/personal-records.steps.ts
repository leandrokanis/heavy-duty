import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './program-fixtures.js'

const { Then } = createBdd(test)

function lastSetButton(page: Page) {
  return page.getByRole('button', { name: /^Corrigir última série/ })
}

Then('the record mark beside the load should read {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text, { exact: true })).toBeAttached()
})

Then('the button of the last set should show a record', async ({ page }) => {
  await expect(lastSetButton(page)).toHaveAccessibleName(/, recorde$/)
  await expect(lastSetButton(page)).toContainText('Recorde')
})

Then('the button of the last set should not show a record', async ({ page }) => {
  await expect(lastSetButton(page)).toBeVisible()
  await expect(lastSetButton(page)).not.toHaveAccessibleName(/, recorde$/)
})
