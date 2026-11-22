import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './program-fixtures.js'
import { readOnlyWorkoutId, readWorkoutSkips } from './workout-fixtures.js'
import { recordThreeSets } from './workout-helpers.js'

const { Given, When, Then } = createBdd(test)

const MIN_TOUCH_TARGET_PX = 56

// The step that records sets already waits for each send, so the rest is skipped with the same tap.
function dialogOf(page: Page) {
  return page.getByRole('dialog')
}

function topControl(page: Page) {
  return page.getByRole('button', { name: /^Sequência do treino/ })
}

Given(
  'the athlete recorded the 3 sets of the first exercise from {string}',
  async ({ page, program }, firstTapAt: string) => {
    await recordThreeSets(page, program, firstTapAt)
  },
)

When(
  'the athlete skips {string} in the sequence at {string}',
  async ({ page }, name: string, skippedAt: string) => {
    if ((await dialogOf(page).count()) === 0) await topControl(page).click()
    await expect(dialogOf(page)).toBeVisible()
    await page.clock.setFixedTime(new Date(skippedAt))
    await dialogOf(page)
      .getByRole('button', { name: `Pular ${name}` })
      .click()
    await expect(dialogOf(page)).toHaveCount(0)
  },
)

Then(
  'the button {string} should be at least 56 px tall and the sheet should not scroll sideways',
  async ({ page }, name: string) => {
    const box = await dialogOf(page).getByRole('button', { name }).boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
    const overflow = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dialog:
        (document.querySelector('[role="dialog"]')?.scrollWidth ?? 0) -
        (document.querySelector('[role="dialog"]')?.clientWidth ?? 0),
    }))
    expect(overflow).toEqual({ page: 0, dialog: 0 })
  },
)

Then(
  'the screen should show the left out section with {string} and {string}',
  async ({ page }, name: string, sets: string) => {
    const section = page.getByRole('region', { name: 'Ficaram de fora' })
    await expect(section.getByRole('listitem')).toHaveText([`${name}${sets}`])
  },
)

Then(
  'the workout should hold the skipped exercise {string} at {string}',
  async ({ program }, exerciseSlug: string, skippedAt: string) => {
    // A scenario without signal never saw the workout id, so the only workout of the database stands in.
    const workoutId = () => program.workoutId ?? readOnlyWorkoutId() ?? ''
    await expect
      .poll(() => readWorkoutSkips(workoutId()), { timeout: 30_000 })
      .toEqual([{ exerciseSlug, skippedAt }])
  },
)

// What the API answered to each write of the page, in order, as set, skip or finish.
const answers = new WeakMap<Page, string[]>()

Given('the page follows the answers of the API', async ({ page }) => {
  const kinds: string[] = []
  answers.set(page, kinds)
  page.on('response', (response) => {
    const request = response.request()
    if (request.method() !== 'POST' || !response.ok()) return
    const kind = /\/api\/workouts\/[^/]+\/(sets|skips|finish)$/.exec(
      new URL(response.url()).pathname,
    )
    if (kind?.[1]) kinds.push(kind[1])
  })
})

Then(
  'the API should have answered the sets, then the skip and then the finish',
  async ({ page }) => {
    await expect
      .poll(() => answers.get(page), { timeout: 30_000 })
      .toEqual(['sets', 'sets', 'skips', 'finish'])
  },
)
