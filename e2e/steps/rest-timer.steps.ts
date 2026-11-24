import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test, workoutIdOf } from './program-fixtures.js'
import { readWorkoutSets } from './workout-fixtures.js'
import { expectWheel } from './workout-helpers.js'

const { When, Then } = createBdd(test)

function valueTextOf(page: Page, name: string) {
  return page.getByRole('progressbar', { name })
}

When('the clock reaches {string}', async ({ page }, instant: string) => {
  await page.clock.setFixedTime(new Date(instant))
})

// The skip records nothing, so unlike the tap step it waits for the screen, not for a send.
When(
  'the athlete skips the rest with {string} at {string}',
  async ({ page }, name: string, tappedAt: string) => {
    const timer = page.getByRole('timer', { name: 'Descanso' })
    await expect(timer).toBeVisible()
    await page.clock.setFixedTime(new Date(tappedAt))
    await page.getByRole('button', { name }).click()
    await expect(timer).toHaveCount(0)
  },
)

Then(
  'the screen should show {string} with {string} kg, {string} rep and set {string}',
  async ({ page }, name: string, load: string, target: string, sets: string) => {
    await expect(page.getByRole('timer', { name: 'Descanso' })).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    await expectWheel(page, 'Carga', load)
    await expectWheel(page, 'Repetições', target)
    await expect(valueTextOf(page, 'Séries')).toHaveAttribute('aria-valuetext', sets)
  },
)

Then('the exercises should show {string}', async ({ page }, exercises: string) => {
  await expect(valueTextOf(page, 'Exercícios')).toHaveAttribute('aria-valuetext', exercises)
})

Then('the workout should hold the set numbers {string}', async ({ program }, numbers: string) => {
  const expected = numbers.split(',').map((number) => Number(number.trim()))
  await expect
    .poll(() => readWorkoutSets(workoutIdOf(program)).map(({ setNumber }) => setNumber))
    .toEqual(expected)
})

Then(
  'the screen should show the heading {string} with no rest and no dialog',
  async ({ page }, heading: string) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
    expect({
      rest: await page.getByRole('timer', { name: 'Descanso' }).count(),
      next: await page.getByRole('button', { name: 'Próximo' }).count(),
      dialogs: await page.getByRole('dialog').count(),
      alertDialogs: await page.getByRole('alertdialog').count(),
    }).toEqual({ rest: 0, next: 0, dialogs: 0, alertDialogs: 0 })
  },
)

// The ring and the timer share a parent, which holds the tone of the last 3 seconds.
function restRing(page: Page) {
  return page.getByRole('timer', { name: 'Descanso' }).locator('xpath=..')
}

Then('the ring of the rest should be in the warning tone', async ({ page }) => {
  await expect(restRing(page)).toHaveAttribute('data-tone', 'warning')
})

Then('the ring of the rest should be in the default tone', async ({ page }) => {
  await expect(restRing(page)).not.toHaveAttribute('data-tone')
})

Then('the rest should offer the switch {string} pressed', async ({ page }, name: string) => {
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible()
  await expect(page.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true')
})
