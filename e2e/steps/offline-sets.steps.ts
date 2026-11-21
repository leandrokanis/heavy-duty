import { type BrowserContext, expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './program-fixtures.js'
import {
  countWorkouts,
  readOnlyWorkoutId,
  readWorkoutSetInstants,
  readWorkoutSets,
} from './workout-fixtures.js'

const { Given, When, Then } = createBdd(test)

const SETS_ROUTE = '**/api/workouts/*/sets'

// Resolves when the page got the first answer to a set send, so the next send is not merged
// into the one still in flight (the queue sends one set at a time).
const firstAnswers = new WeakMap<BrowserContext, Promise<void>>()

function trackFirstAnswer(context: BrowserContext): () => void {
  let answered: () => void = () => {}
  firstAnswers.set(
    context,
    new Promise<void>((resolve) => {
      answered = resolve
    }),
  )
  return answered
}

// Next.js keeps its own empty route announcer with role alert, so the notice is found by its text.
function noticeOf(page: Page) {
  return page.getByRole('alert').filter({ hasText: 'recusada' })
}

// The queue also retries on a timer; the online event only makes the test faster than the 15 s interval.
function fireOnline(page: Page) {
  return page.evaluate(() => window.dispatchEvent(new Event('online')))
}

Given('the connection drops', async ({ context }) => {
  await context.setOffline(true)
})

When('the connection returns', async ({ context, page }) => {
  await context.setOffline(false)
  await fireOnline(page)
})

When('the queue sends again', async ({ context, page }) => {
  await firstAnswers.get(context)
  await fireOnline(page)
})

When(
  'the athlete taps {string} at {string} without waiting for the send',
  async ({ page }, name: string, tappedAt: string) => {
    await page.clock.setFixedTime(new Date(tappedAt))
    await page.getByRole('button', { name }).click()
  },
)

When('the page is reloaded', async ({ page }) => {
  await page.reload()
})

When('the page is reloaded at {string}', async ({ page }, instant: string) => {
  await page.clock.setFixedTime(new Date(instant))
  await page.reload()
})

Given(
  'the athlete opened the app with a connection and the service worker controls it',
  async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /^A(\s|$)/ })).toBeVisible()
    await page.evaluate(() => navigator.serviceWorker.ready)
    await expect
      .poll(async () => {
        const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null)
        if (!controlled) await page.reload()
        return controlled
      })
      .toBe(true)
    await expect(page.getByRole('button', { name: /^A(\s|$)/ })).toBeVisible()
  },
)

When(
  'the athlete starts the day {string} at {string} without a connection',
  async ({ page }, letter: string, startedAt: string) => {
    await page.clock.setFixedTime(new Date(startedAt))
    await page.getByRole('button', { name: new RegExp(`^${letter}(\\s|$)`) }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Começar' }).click()
    await expect(page.getByRole('button', { name: 'Próximo' })).toBeVisible()
  },
)

Then(
  'the letters should show {string} and {string}',
  async ({ page }, letter: string, label: string) => {
    await expect(
      page.getByRole('button', { name: new RegExp(`^${letter}\\s*${label}`) }),
    ).toBeVisible()
  },
)

Given('the response to the first send is lost', async ({ context }) => {
  let first = true
  const answered = trackFirstAnswer(context)
  // The API records the set, then the page never gets the answer, so it sends the same id again.
  await context.route(SETS_ROUTE, async (route) => {
    if (!first) return route.continue()
    first = false
    await route.fetch()
    await route.abort('failed')
    answered()
  })
})

Given('the API answers 401 to the sets', async ({ context }) => {
  await context.route(SETS_ROUTE, (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'unauthenticated',
        message: 'Entre com a sua chave de acesso.',
      }),
    }),
  )
})

When('the session is valid again and the queue sends again', async ({ context, page }) => {
  await firstAnswers.get(context)
  await context.unroute(SETS_ROUTE)
  await fireOnline(page)
})

When('the athlete taps {string} on the screen', async ({ page }, name: string) => {
  await page.getByRole('button', { name }).click()
})

Then(
  'the screen should show the exercise {string} resting with {string} left',
  async ({ page }, name: string, clock: string) => {
    await expect(page.getByRole('timer', { name: 'Descanso' })).toHaveText(clock)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
  },
)

Then('the screen should not show {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toHaveCount(0)
})

Then('the screen should show the notice {string}', async ({ page }, message: string) => {
  await expect(noticeOf(page)).toContainText(message)
})

Then('the screen should show no notice', async ({ page }) => {
  await expect(noticeOf(page)).toHaveCount(0)
})

Then('no workout should be recorded on the server', () => {
  expect(countWorkouts()).toBe(0)
})

Then(
  'the workout should hold {int} sets recorded at {string} with load {int} g and {int} reps',
  // biome-ignore lint/correctness/noEmptyPattern: playwright-bdd requires a destructured first argument.
  async ({}, count: number, instants: string, loadG: number, reps: number) => {
    await expect.poll(() => readOnlyWorkoutId(), { timeout: 30_000 }).toBeDefined()
    const workoutId = readOnlyWorkoutId() ?? ''
    await expect.poll(() => readWorkoutSets(workoutId).length, { timeout: 30_000 }).toBe(count)

    expect({
      values: readWorkoutSets(workoutId).map((set) => ({ loadG: set.loadG, reps: set.reps })),
      performedAt: readWorkoutSetInstants(workoutId),
    }).toEqual({
      values: Array.from({ length: count }, () => ({ loadG, reps })),
      performedAt: instants.split(',').map((instant) => instant.trim()),
    })
  },
)
