import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test, workoutIdOf } from './program-fixtures.js'
import { settledBox } from './touch-target.js'
import { readOnlyWorkoutId, readWorkoutSets } from './workout-fixtures.js'
import { dragWheel } from './workout-helpers.js'

const { Given, When, Then } = createBdd(test)

const SET_PATH = /^\/api\/workouts\/[^/]+\/sets(\/[^/]+)?$/

function lastSetButton(page: Page) {
  return page.getByRole('button', { name: /^Corrigir última série/ })
}

// The writes of the sets the API accepted, in arrival order: "POST 45000" for a set and
// "PATCH 42500" for a correction.
const writes = new WeakMap<Page, string[]>()

Given('the page follows the writes of the API to the sets', async ({ page }) => {
  const received: string[] = []
  writes.set(page, received)
  page.on('response', (response) => {
    const request = response.request()
    const method = request.method()
    if (!response.ok() || (method !== 'POST' && method !== 'PATCH')) return
    if (!SET_PATH.test(new URL(response.url()).pathname)) return
    const body = request.postDataJSON() as { loadG: number }
    received.push(`${method} ${body.loadG}`)
  })
})

When(
  'the athlete lowers {string} by {int} step in the correction of the last set',
  async ({ page }, wheel: string, steps: number) => {
    await lastSetButton(page).click()
    const dialog = page.getByRole('dialog', { name: 'Corrigir última série' })
    await expect(dialog).toBeVisible()
    for (let step = 0; step < steps; step += 1) {
      await dialog.getByRole('button', { name: `Diminuir ${wheel.toLowerCase()}` }).click()
    }
    await dialog.getByRole('button', { name: 'Salvar' }).click()
    await expect(dialog).toHaveCount(0)
  },
)

function correctionSheet(page: Page) {
  return page.getByRole('dialog', { name: 'Corrigir última série' })
}

// How far the sheet moved from its resting place at each move of a drag, in pixels.
const sheetShifts = new WeakMap<Page, number[]>()

When(
  'the athlete drags the wheel {string} of the correction {int} steps {word} with a finger',
  async ({ page }, wheel: string, steps: number, direction: string) => {
    await lastSetButton(page).click()
    const dialog = correctionSheet(page)
    const restingY = (await settledBox(dialog))?.y ?? 0
    const shifts: number[] = []
    sheetShifts.set(page, shifts)
    await dragWheel(
      dialog.getByRole('spinbutton', { name: wheel }),
      steps,
      direction,
      'touch',
      async () => {
        shifts.push(((await dialog.boundingBox())?.y ?? 0) - restingY)
      },
    )
  },
)

Then(
  'the correction of the last set should stay in place with the wheel {string} at {string}',
  async ({ page }, wheel: string, value: string) => {
    const shifts = sheetShifts.get(page) ?? []
    expect(Math.max(0, ...shifts.map(Math.abs))).toBe(0)
    const dialog = correctionSheet(page)
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('spinbutton', { name: wheel })).toHaveAttribute(
      'aria-valuenow',
      value.replace(',', '.'),
    )
  },
)

When('the athlete saves the correction of the last set', async ({ page }) => {
  const dialog = correctionSheet(page)
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await expect(dialog).toHaveCount(0)
})

Then('the button of the last set should read {string}', async ({ page }, text: string) => {
  await expect(lastSetButton(page)).toHaveText(text)
})

// A scenario without signal never saw the workout id, so the only workout of the database stands in.
function workoutIdFor(program: Parameters<typeof workoutIdOf>[0]): string {
  return program.workoutId ?? readOnlyWorkoutId() ?? workoutIdOf(program)
}

Then(
  'the workout should hold the set {int} of {string} with load {int} g and {int} reps',
  async ({ program }, setNumber: number, name: string, loadG: number, reps: number) => {
    const slug = name.toLowerCase().replaceAll(' ', '-')
    await expect
      .poll(
        () =>
          readWorkoutSets(workoutIdFor(program))
            .filter((set) => set.exerciseSlug === slug && set.setNumber === setNumber)
            .map(({ loadG, reps, seconds }) => ({ loadG, reps, seconds })),
        { timeout: 30_000 },
      )
      .toEqual([{ loadG, reps, seconds: null }])
  },
)

Then(
  'the workout should hold the set {int} of {string} with {int} seconds',
  async ({ program }, setNumber: number, name: string, seconds: number) => {
    const slug = name.toLowerCase().replaceAll(' ', '-')
    await expect
      .poll(
        () =>
          readWorkoutSets(workoutIdFor(program))
            .filter((set) => set.exerciseSlug === slug && set.setNumber === setNumber)
            .map((set) => set.seconds),
        { timeout: 30_000 },
      )
      .toEqual([seconds])
  },
)

Then(
  'the API should have received the set at {int} g and then the correction at {int} g',
  async ({ page }, setLoadG: number, correctedLoadG: number) => {
    await expect
      .poll(() => writes.get(page), { timeout: 30_000 })
      .toEqual([`POST ${setLoadG}`, `PATCH ${correctedLoadG}`])
  },
)
