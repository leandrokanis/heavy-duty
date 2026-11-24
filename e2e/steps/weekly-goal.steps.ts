import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { callMcpTool } from './catalog-api.js'
import { test, windowsResponseOf } from './group-window-fixtures.js'
import { programIdOf } from './program-fixtures.js'
import { toExerciseSlug, toLoadG } from './program-helpers.js'
import { recordWorkout } from './workout-fixtures.js'

const { Given, When, Then } = createBdd(test)

const DAY_MS = 24 * 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

function weeklyGoalItem(page: Page) {
  return page.getByRole('region', { name: 'Faixa de jogo' }).getByRole('img', {
    name: /janelas aproveitadas na semana$/,
  })
}

// One minute before the real clock keeps the training in the week of now, except in the first
// minute of the week.
Given(
  '{int} sets of {string} of {int} reps with {string} are recorded {int} minute(s) ago',
  async (
    { request, program },
    count: number,
    name: string,
    reps: number,
    load: string,
    minutes: number,
  ) => {
    const exerciseSlug = await toExerciseSlug(request, name)
    const sets = Array.from({ length: count }, () => ({ exerciseSlug, loadG: toLoadG(load), reps }))
    recordWorkout(
      programIdOf(program),
      'A',
      sets,
      new Date(Date.now() - minutes * MINUTE_MS).toISOString(),
    )
  },
)

When(
  'the planner sets the weekly goal of {int} windows through MCP',
  async ({ request, groupWindow }, weeklyGoal: number) => {
    groupWindow.response = await callMcpTool(request, 'set_weekly_goal', { weeklyGoal })
  },
)

// The API runs with the real clock, so the week starts a day before now and holds the new goal.
Then(
  'the planner should see the weekly goal of {int} in the week of now through MCP',
  async ({ request, groupWindow }, weeklyGoal: number) => {
    const set = (await windowsResponseOf(groupWindow).json()) as { result?: { isError?: boolean } }
    expect(set.result?.isError).toBeFalsy()
    const fromMs = Date.now() - DAY_MS
    const response = await callMcpTool(request, 'get_windows_used', {
      from: new Date(fromMs).toISOString(),
      to: new Date(fromMs + 7 * DAY_MS).toISOString(),
    })
    const body = (await response.json()) as {
      result?: { structuredContent?: { weeks: { weeklyGoal: number | null }[] } }
    }

    expect(body.result?.structuredContent?.weeks[0]?.weeklyGoal).toBe(weeklyGoal)
  },
)

Then(
  'the game strip should show {int} of {int} windows used in the week',
  async ({ page }, used: number, goal: number) => {
    const item = weeklyGoalItem(page)

    await expect(item).toHaveAccessibleName(`${used} de ${goal} janelas aproveitadas na semana`)
    await expect(item).toHaveText(`${used}/${goal}janelas`)
  },
)

Then(
  'the game strip should show the weekly goal of {int} windows',
  async ({ page }, goal: number) => {
    await expect(weeklyGoalItem(page)).toHaveAccessibleName(
      new RegExp(`^\\d+ de ${goal} janelas aproveitadas na semana$`),
    )
  },
)

Then('the weekly goal should have no horizontal overflow', async ({ page }) => {
  await expect(weeklyGoalItem(page)).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )

  expect(overflow).toBe(0)
})
