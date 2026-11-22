import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test, workoutIdOf } from './program-fixtures.js'
import { readWorkoutSets } from './workout-fixtures.js'

const { When, Then } = createBdd(test)

const SETS_PATH = /^\/api\/workouts\/([^/]+)\/sets$/

// The sets the page sent: a timed exercise sends nothing until the execution ends.
const sentSets = new WeakMap<Page, { posts: number }>()

function sentSetsOf(page: Page): { posts: number } {
  let state = sentSets.get(page)
  if (!state) {
    state = { posts: 0 }
    sentSets.set(page, state)
    const created = state
    page.on('request', (request) => {
      if (request.method() === 'POST' && SETS_PATH.test(new URL(request.url()).pathname)) {
        created.posts += 1
      }
    })
  }
  return state
}

function executionClock(page: Page) {
  return page.getByRole('timer', { name: 'Tempo de execução' })
}

// Taps that open or cancel a timer record nothing, so they wait for the screen, not for a send.
When(
  'the athlete taps {string} on the timer at {string}',
  async ({ page }, name: string, tappedAt: string) => {
    sentSetsOf(page)
    await page.clock.setFixedTime(new Date(tappedAt))
    await page.getByRole('button', { name }).click()
  },
)

// The set is born from the clock, so the step waits for its send and keeps the workout id.
When(
  'the clock reaches {string} and the set is sent',
  async ({ page, program }, instant: string) => {
    const sent = page.waitForResponse(
      (response) => response.url().includes('/sets') && response.request().method() === 'POST',
    )
    await page.clock.setFixedTime(new Date(instant))
    const response = await sent
    program.workoutId ??= /\/api\/workouts\/([^/]+)\/sets/.exec(response.url())?.[1]
  },
)

Then('the count should show {string}', async ({ page }, number: string) => {
  await expect(page.getByRole('timer', { name: 'Contagem para começar' })).toHaveText(number)
})

Then('the button {string} should be disabled', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name })).toHaveAttribute('aria-disabled', 'true')
})

Then('the execution clock should show {string}', async ({ page }, clock: string) => {
  await expect(executionClock(page)).toHaveText(clock)
})

Then('the ring of the execution should be in the warning tone', async ({ page }) => {
  await expect(executionClock(page).locator('xpath=..')).toHaveAttribute('data-tone', 'warning')
})

Then('no set should have been sent', async ({ page }) => {
  expect(sentSetsOf(page).posts).toBe(0)
})

Then('the workout should hold the seconds {string}', async ({ program }, seconds: string) => {
  const expected = seconds.split(',').map((value) => Number(value.trim()))
  await expect
    .poll(() => readWorkoutSets(workoutIdOf(program)).map((set) => set.seconds))
    .toEqual(expected)
})

Then(
  'the screen should show {string} with the target {string} s and set {string}',
  async ({ page }, name: string, target: string, sets: string) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    await expect(page.getByRole('group', { name: 'Alvo' })).toHaveText(`${target}s`)
    await expect(page.getByRole('progressbar', { name: 'Séries' })).toHaveAttribute(
      'aria-valuetext',
      sets,
    )
  },
)
