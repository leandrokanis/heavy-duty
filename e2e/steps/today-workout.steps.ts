import { expect, type Page } from '@playwright/test'
import { createBdd, type DataTable } from 'playwright-bdd'
import { postPlannedExercise } from './catalog-api.js'
import { type ProgramState, programIdOf, test } from './program-fixtures.js'
import { addDay, createProgram, toExerciseSlug, toLoadG, toTarget } from './program-helpers.js'
import { settledBox } from './touch-target.js'
import { clearWorkouts, deactivatePrograms, recordWorkout } from './workout-fixtures.js'
import { expectWheel } from './workout-helpers.js'

const { Given, When, Then } = createBdd(test)

const SUPINO_RETO = { name: 'Supino reto', sets: 3, target: '10 reps', load: '40 kg', rest: 90 }

type PlannedRow = { name: string; sets: number; target: string; load: string; rest: number }

// Methods of the /api requests each page sent, to prove that opening and closing record nothing.
const apiMethods = new WeakMap<Page, string[]>()

function letterButton(page: Page, letter: string) {
  return page.getByRole('button', { name: new RegExp(`^${letter}(\\s|$)`) })
}

async function planDay(
  request: Parameters<typeof createProgram>[0],
  program: ProgramState,
  letter: string,
  rows: readonly PlannedRow[],
) {
  expect((await addDay(request, program, letter)).status()).toBe(201)
  for (const row of rows) {
    const { targetReps, targetSeconds } = toTarget(row.target)
    const response = await postPlannedExercise(request, programIdOf(program), letter, {
      exerciseSlug: await toExerciseSlug(request, row.name),
      sets: row.sets,
      ...(targetReps === null ? { targetSeconds } : { targetReps }),
      loadG: toLoadG(row.load),
      restSeconds: row.rest,
    })
    expect(response.status()).toBe(201)
  }
}

async function openSheet(page: Page, letter: string) {
  await page.goto('/')
  await letterButton(page, letter).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

Given('no workout is recorded', () => {
  clearWorkouts()
})

Given('no program is active', () => {
  deactivatePrograms()
})

Given(
  'an active program with goal {string} and the day {string}:',
  async ({ request, program }, goal: string, letter: string, table: DataTable) => {
    await createProgram(request, program, 'Programa do dia', goal)
    program.letter = letter
    const rows = table.hashes().map((row) => ({
      name: row.exercise ?? '',
      sets: Number(row.sets),
      target: row.target ?? '',
      load: row.load ?? '',
      rest: Number(row.rest),
    }))
    await planDay(request, program, letter, rows)
  },
)

Given('an active program with the days {string}', async ({ request, program }, days: string) => {
  await createProgram(request, program, 'Programa do dia', 'hypertrophy')
  for (const letter of days.split(',').map((day) => day.trim())) {
    await planDay(request, program, letter, [SUPINO_RETO])
  }
})

Given('it is the first time with this exercise', () => {})

Given(
  'in the last workout the athlete did {string} at {string}',
  async ({ request, program }, name: string, load: string) => {
    recordWorkout(programIdOf(program), 'A', [
      { exerciseSlug: await toExerciseSlug(request, name), loadG: toLoadG(load), reps: 10 },
    ])
  },
)

Given(
  'the last workout of this program was of the day {string}',
  async ({ request, program }, letter: string) => {
    recordWorkout(programIdOf(program), letter, [
      { exerciseSlug: await toExerciseSlug(request, SUPINO_RETO.name), loadG: 40000, reps: 10 },
    ])
  },
)

Given('the athlete opened the sheet of the day {string}', async ({ page }, letter: string) => {
  const methods: string[] = []
  apiMethods.set(page, methods)
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) methods.push(request.method())
  })
  await openSheet(page, letter)
})

When('the athlete opens the app', async ({ page }) => {
  await page.goto('/')
})

When('the athlete taps the day {string}', async ({ page }, letter: string) => {
  await openSheet(page, letter)
})

When('the athlete opens the day {string}', async ({ page }, letter: string) => {
  await openSheet(page, letter)
  await page.getByRole('dialog').getByRole('button', { name: 'Começar' }).click()
})

When('the athlete closes the sheet', async ({ page }) => {
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click()
})

Then(
  'the workout screen should show {string} with {string} and {string}',
  async ({ page }, name: string, load: string, target: string) => {
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expectWheel(page, 'Carga', load.replace(' kg', ''))
    if (target.endsWith(' rep')) await expectWheel(page, 'Repetições', target.replace(' rep', ''))
    else await expectWheel(page, 'Tempo', target.replace(' s', ''))
  },
)

Then(
  'a sheet should show {string} with {string}, {string} with {string} and {string}',
  async (
    { page },
    first: string,
    firstSets: string,
    second: string,
    secondSets: string,
    duration: string,
  ) => {
    const sheet = page.getByRole('dialog')
    await expect(sheet.getByRole('listitem')).toHaveText([
      `${first}${firstSets}`,
      `${second}${secondSets}`,
    ])
    await expect(sheet.getByText(duration)).toBeVisible()
  },
)

Then('the sheet controls should be at least 56 px tall', async ({ page }) => {
  const sheet = page.getByRole('dialog')
  const heights = await Promise.all(
    ['Começar', 'Fechar'].map(
      async (name) => (await settledBox(sheet.getByRole('button', { name })))?.height ?? 0,
    ),
  )

  expect(heights.every((height) => height >= 56)).toBe(true)
})

Then('the workout screen should not be showing', async ({ page }) => {
  await expect(page.getByRole('spinbutton', { name: 'Carga' })).toHaveCount(0)
})

Then('the screen should show the days of the program again', async ({ page }) => {
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(letterButton(page, 'A')).toBeVisible()
})

Then('the app should not have recorded anything', async ({ page }) => {
  expect(apiMethods.get(page)?.filter((method) => method !== 'GET')).toEqual([])
})

Then('the day {string} should appear as the suggested day', async ({ page }, letter: string) => {
  const suggested = page.getByRole('button', { name: /Sugerida/ })
  await expect(suggested).toHaveCount(1)
  await expect(suggested).toHaveAccessibleName(new RegExp(`^${letter}(\\s|$)`))
})

Then('the screen should show the message {string}', async ({ page }, message: string) => {
  await expect(page.getByText(message)).toBeVisible()
})
