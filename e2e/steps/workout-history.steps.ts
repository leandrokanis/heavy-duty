import { expect, type Page } from '@playwright/test'
import { createBdd, type DataTable } from 'playwright-bdd'
import { programIdOf, test } from './program-fixtures.js'
import { toExerciseSlug, toLoadG } from './program-helpers.js'
import { finishWorkout, recordWorkout, type WorkoutSetInput } from './workout-fixtures.js'

const { Given, When, Then } = createBdd(test)

const DAY_MS = 24 * 60 * 60 * 1000
const WORKOUT_MINUTES = 50
// "sáb., 21 de nov." or, outside the current year, "ter., 30 de dez. de 2025".
const SHORT_DATE = /[a-zà-ú]{3}\., \d{1,2} de [a-zà-ú]{3}\./

function historyList(page: Page) {
  return page.getByRole('list', { name: 'Treinos' })
}

function parseMeasure(measure: string): Pick<WorkoutSetInput, 'reps' | 'seconds'> {
  const reps = /^(\d+) reps$/.exec(measure)?.[1]
  if (reps !== undefined) return { reps: Number(reps) }
  const seconds = /^(\d+) s$/.exec(measure)?.[1]
  if (seconds !== undefined) return { seconds: Number(seconds) }
  throw new Error(`Measure "${measure}" is neither reps nor seconds`)
}

// One workout per day and age, relative to the real clock, as the history pages are; the sets
// of an exercise are numbered in their order, and each workout ends 50 minutes after it starts.
Given('these sets were recorded:', async ({ request, program }, table: DataTable) => {
  const workouts = new Map<string, { letter: string; daysAgo: number; sets: WorkoutSetInput[] }>()
  for (const row of table.hashes()) {
    const letter = row.day ?? ''
    const daysAgo = Number(row['days ago'])
    const key = `${letter}:${daysAgo}`
    const workout = workouts.get(key) ?? { letter, daysAgo, sets: [] }
    const exerciseSlug = await toExerciseSlug(request, row.exercise ?? '')
    const setNumber = workout.sets.filter((set) => set.exerciseSlug === exerciseSlug).length + 1
    workout.sets.push({
      exerciseSlug,
      loadG: toLoadG(row.load ?? ''),
      setNumber,
      ...parseMeasure(row.measure ?? ''),
    })
    workouts.set(key, workout)
  }
  for (const { letter, daysAgo, sets } of workouts.values()) {
    const startedAtMs = Date.now() - daysAgo * DAY_MS
    const workoutId = recordWorkout(
      programIdOf(program),
      letter,
      sets,
      new Date(startedAtMs).toISOString(),
    )
    finishWorkout(
      workoutId,
      new Date(startedAtMs + WORKOUT_MINUTES * 60_000).toISOString(),
      'completed',
    )
  }
})

When('the athlete opens the history from the workout of the day', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Histórico' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Histórico' })).toBeVisible()
  await expect(page.getByRole('main')).not.toHaveAttribute('aria-busy', 'true')
})

When('the athlete taps the link {string}', async ({ page }, name: string) => {
  await page.getByRole('link', { name }).click()
})

When('the athlete opens the workout {string} of the history', async ({ page }, label: string) => {
  await historyList(page)
    .getByRole('link', { name: new RegExp(`^\\w\\s*${label}`) })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible()
})

Then(
  'the history should list these workouts in this order:',
  async ({ page }, table: DataTable) => {
    const expected = table.hashes().map((row) => new RegExp(`^\\w\\s*${row.workout}`))
    await expect(historyList(page).getByRole('link')).toHaveText(expected)
  },
)

Then('each workout of the history should show its date', async ({ page }) => {
  const rows = historyList(page).getByRole('link')
  for (const row of await rows.all()) {
    await expect(row).toHaveText(SHORT_DATE)
  }
})

Then(
  'the detail should show these sets of {string}:',
  async ({ page }, exercise: string, table: DataTable) => {
    const items = page.getByRole('list', { name: `Séries de ${exercise}` }).getByRole('listitem')
    await expect(items).toHaveText(table.hashes().map((row) => new RegExp(`${row.set}$`)))
  },
)

Then('the detail should offer no control that changes the workout', async ({ page }) => {
  const main = page.getByRole('main')
  await expect(main.getByRole('list', { name: /^Séries de / })).not.toHaveCount(0)
  // "Apagar treino" removes the whole workout (US-F20-02); no control changes a value (D50).
  await expect(main.getByRole('button')).toHaveCount(1)
  await expect(main.getByRole('button', { name: 'Apagar treino' })).toBeVisible()
  await expect(main.getByRole('textbox')).toHaveCount(0)
  await expect(main.getByRole('spinbutton')).toHaveCount(0)
  await expect(main.getByRole('link')).toHaveCount(1)
  await expect(main.getByRole('link', { name: 'Voltar ao histórico' })).toBeVisible()
})

Then(
  'the screen should show {string} with the way back to the workout of the day',
  async ({ page }, title: string) => {
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Voltar ao treino do dia' })).toBeVisible()
  },
)
