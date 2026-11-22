import { expect, type Page } from '@playwright/test'
import { createBdd, type DataTable } from 'playwright-bdd'
import { test } from './program-fixtures.js'
import { readOnlyWorkoutId, readWorkoutEnd } from './workout-fixtures.js'

const { Given, When, Then } = createBdd(test)

// The top control has the accessible name "Sequência do treino, letra A, exercício N de M".
function topControl(page: Page) {
  return page.getByRole('button', { name: /^Sequência do treino/ })
}

function dialogOf(page: Page) {
  return page.getByRole('dialog')
}

// The header of each exercise row; the sets of a done exercise are a nested list below it (US-F03-06).
function exerciseRows(page: Page) {
  return dialogOf(page)
    .getByRole('list', { name: 'Exercícios' })
    .locator(':scope > li > :first-child')
}

When('the athlete opens the sequence', async ({ page }) => {
  await topControl(page).click()
  await expect(dialogOf(page)).toBeVisible()
})

When(
  'the athlete picks {string} in the sequence at {string}',
  async ({ page }, name: string, pickedAt: string) => {
    await topControl(page).click()
    await expect(dialogOf(page)).toBeVisible()
    await page.clock.setFixedTime(new Date(pickedAt))
    await dialogOf(page)
      .getByRole('button', { name: new RegExp(`^${name}`) })
      .click()
    await expect(dialogOf(page)).toHaveCount(0)
  },
)

When(
  'the athlete taps {string} in the dialog at {string}',
  async ({ page }, name: string, tappedAt: string) => {
    await page.clock.setFixedTime(new Date(tappedAt))
    await dialogOf(page).getByRole('button', { name, exact: true }).click()
  },
)

Then('the button {string} should be enabled', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name })).toBeEnabled()
})

Then(
  'the screen should show {string} and {string}',
  async ({ page }, label: string, name: string) => {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
    await expect(page.getByText(name, { exact: true })).toBeVisible()
  },
)

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Each row of the sheet reads "name", state and "N de M", in that order.
function rowText(name: string, state: string, sets: string) {
  return `${name}${state}${sets}`
}

Then(
  'the sequence sheet should list these exercises in this order:',
  async ({ page }, table: DataTable) => {
    // The current row also holds the "Pular" button when another exercise is left (US-F03-05).
    const expected = table
      .hashes()
      .map(
        (row) =>
          new RegExp(
            `^${escapeRegExp(rowText(row.exercise ?? '', row.state ?? '', row.sets ?? ''))}(Pular)?$`,
          ),
      )
    await expect(exerciseRows(page)).toHaveText(expected)
  },
)

Then(
  'the sequence sheet should list {string} as {string} with {string}',
  async ({ page }, name: string, state: string, sets: string) => {
    await expect(exerciseRows(page).filter({ hasText: name })).toHaveText(
      rowText(name, state, sets),
    )
  },
)

Then('the sequence sheet should have the button {string}', async ({ page }, name: string) => {
  await expect(dialogOf(page).getByRole('button', { name, exact: true })).toBeVisible()
})

Then(
  'the confirmation should show {string} and {string}',
  async ({ page }, done: string, left: string) => {
    await expect(dialogOf(page).getByText(done, { exact: true })).toBeVisible()
    await expect(dialogOf(page).getByText(left, { exact: true })).toBeVisible()
  },
)

Then(
  'the workout should be recorded as ended at {string} with the reason {string}',
  async ({ program }, finishedAt: string, endReason: string) => {
    // A scenario without signal never saw the workout id, so the only workout of the database stands in.
    const workoutId = () => program.workoutId ?? readOnlyWorkoutId() ?? ''
    await expect
      .poll(() => readWorkoutEnd(workoutId()), { timeout: 30_000 })
      .toEqual({ finishedAt, endReason })
  },
)

Given('the system asks for more contrast and reduced motion', async ({ page }) => {
  await page.emulateMedia({ contrast: 'more', reducedMotion: 'reduce' })
})

When('the athlete presses Escape', async ({ page }) => {
  await page.keyboard.press('Escape')
})

Then('the sequence sheet should be opaque, with no blur', async ({ page }) => {
  const style = await dialogOf(page).evaluate((element) => {
    const computed = getComputedStyle(element)
    return { background: computed.backgroundColor, blur: computed.backdropFilter }
  })
  // An opaque colour has no alpha channel in the computed value.
  expect(style.blur).toBe('none')
  expect(style.background).toMatch(/^rgb\(/)
})

Then('the sequence sheet should be closed', async ({ page }) => {
  await expect(dialogOf(page)).toHaveCount(0)
  await expect(topControl(page)).toBeFocused()
})
