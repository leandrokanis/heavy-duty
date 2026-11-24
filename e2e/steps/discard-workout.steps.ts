import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './program-fixtures.js'
import { countWorkouts, readOnlyWorkoutId, readWorkoutSets } from './workout-fixtures.js'

const { When, Then } = createBdd(test)

// The answer of the removal, kept for the step that checks it.
const removalStatuses = new WeakMap<object, number>()

Then('the dialog should read {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('dialog').getByText(text, { exact: true })).toBeVisible()
})

Then('the workout should hold {int} sets on the server', async ({ program }, count: number) => {
  const workoutId = () => program.workoutId ?? readOnlyWorkoutId() ?? ''
  await expect.poll(() => readWorkoutSets(workoutId()).length, { timeout: 30_000 }).toBe(count)
})

// The removal goes through the queue, so the server gets it a moment after the tap.
Then('the server should end with no workout', async () => {
  await expect.poll(() => countWorkouts(), { timeout: 30_000 }).toBe(0)
})

When('the connection returns and the app sends the removal', async ({ context, page, program }) => {
  const removal = page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' && /\/api\/workouts\/[^/]+$/.test(response.url()),
    { timeout: 30_000 },
  )
  await context.setOffline(false)
  // The queue retries on a timer too; the online event only spares the test the 15 s wait.
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  removalStatuses.set(program, (await removal).status())
})

Then('the removal should be answered 404 and no set should reach the server', ({ program }) => {
  expect({ status: removalStatuses.get(program), workouts: countWorkouts() }).toEqual({
    status: 404,
    workouts: 0,
  })
})
