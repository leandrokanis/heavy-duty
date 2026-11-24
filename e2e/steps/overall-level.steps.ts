import { expect, type Page } from '@playwright/test'
import { createBdd, type DataTable } from 'playwright-bdd'
import { postPlannedExercise } from './catalog-api.js'
import { programIdOf, test } from './program-fixtures.js'
import { addDay, toExerciseSlug, toLoadG, toTarget } from './program-helpers.js'
import { settledBox } from './touch-target.js'

const { Given, When, Then } = createBdd(test)

const MIN_TOUCH_PX = 44

function overallLevel(page: Page) {
  return page.getByRole('region', { name: 'Faixa de jogo' }).getByRole('button', {
    name: /^Nível geral/,
  })
}

Given(
  'the program also has the day {string}:',
  async ({ request, program }, letter: string, table: DataTable) => {
    expect((await addDay(request, program, letter)).status()).toBe(201)
    for (const row of table.hashes()) {
      const { targetReps, targetSeconds } = toTarget(row.target ?? '')
      const response = await postPlannedExercise(request, programIdOf(program), letter, {
        exerciseSlug: await toExerciseSlug(request, row.exercise ?? ''),
        sets: Number(row.sets),
        ...(targetReps === null ? { targetSeconds } : { targetReps }),
        loadG: toLoadG(row.load ?? ''),
        restSeconds: Number(row.rest),
      })
      expect(response.status()).toBe(201)
    }
  },
)

When('the athlete taps the overall level', async ({ page }) => {
  await overallLevel(page).click()
})

Then(
  'the overall level should show {int}, limited by {string}',
  async ({ page }, level: number, group: string) => {
    const button = overallLevel(page)
    await expect(button).toHaveAccessibleName(
      new RegExp(`^Nível geral ${level} de 20, limitado por ${group.toLowerCase()}[.,]`),
    )
    await expect(button).toContainText(group)
    await expect(button.locator('[data-tier]')).toHaveText(String(level))
  },
)

Then('the sheet to start the day {string} should show', async ({ page }, letter: string) => {
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByRole('heading')).toHaveText(new RegExp(`^${letter}(\\s|$)`))
  await expect(sheet.getByRole('button', { name: 'Começar' })).toBeVisible()
})

Then(
  'the screen should show when the window of {string} opens, with no sheet',
  async ({ page }, group: string) => {
    await expect(page.getByRole('status').filter({ hasText: `${group} abre ` })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  },
)

Then(
  'the overall level should have a touch area of at least 44 px and no horizontal overflow',
  async ({ page }) => {
    const box = await settledBox(overallLevel(page))
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )

    expect({
      tall: (box?.height ?? 0) >= MIN_TOUCH_PX,
      wide: (box?.width ?? 0) >= MIN_TOUCH_PX,
      overflow,
    }).toEqual({ tall: true, wide: true, overflow: 0 })
  },
)
