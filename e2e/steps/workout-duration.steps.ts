import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './program-fixtures.js'

const { Then } = createBdd(test)

Then('the total time should read {string}', async ({ page }, clock: string) => {
  await expect(page.getByRole('timer', { name: 'Tempo total' })).toHaveText(clock)
})
