import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { callMcpTool } from './catalog-api.js'
import { type GroupWindowState, test, windowsResponseOf } from './group-window-fixtures.js'
import { programIdOf } from './program-fixtures.js'
import { toExerciseSlug, toLoadG } from './program-helpers.js'
import { recordWorkout } from './workout-fixtures.js'

const { Given, When, Then } = createBdd(test)

const HOUR_MS = 60 * 60 * 1000

type GroupWindow = {
  muscleGroup: { slug: string }
  state: string
  lastTrainedAt: string | null
  opensAt: string | null
  closesAt: string | null
}

// The API runs with the real clock, so the training is relative to the current instant.
Given(
  '{int} sets of {string} of {int} reps with {string} are recorded {int} hour(s) ago',
  async (
    { request, program },
    count: number,
    name: string,
    reps: number,
    load: string,
    hours: number,
  ) => {
    const exerciseSlug = await toExerciseSlug(request, name)
    const sets = Array.from({ length: count }, () => ({
      exerciseSlug,
      loadG: toLoadG(load),
      reps,
    }))
    recordWorkout(
      programIdOf(program),
      'A',
      sets,
      new Date(Date.now() - hours * HOUR_MS).toISOString(),
    )
  },
)

When('the planner lists the activity windows through MCP', async ({ request, groupWindow }) => {
  groupWindow.response = await callMcpTool(request, 'list_activity_windows', {})
})

async function windowOf(state: GroupWindowState, slug: string) {
  const body = (await windowsResponseOf(state).json()) as {
    result?: { isError?: boolean; structuredContent?: { groups: GroupWindow[] } }
  }
  expect(body.result?.isError).toBeFalsy()
  const group = body.result?.structuredContent?.groups.find((row) => row.muscleGroup.slug === slug)
  expect(group).toBeDefined()
  return group as GroupWindow
}

Then(
  'the group {string} should be {string}',
  async ({ groupWindow }, slug: string, state: string) => {
    expect((await windowOf(groupWindow, slug)).state).toBe(state)
  },
)

Then('the window of {string} should open after now', async ({ groupWindow }, slug: string) => {
  const { opensAt } = await windowOf(groupWindow, slug)

  expect(Date.parse(opensAt ?? '')).toBeGreaterThan(Date.now())
})

Then(
  'the group {string} should be {string} with no instants',
  async ({ groupWindow }, slug: string, state: string) => {
    const group = await windowOf(groupWindow, slug)

    expect([group.state, group.lastTrainedAt, group.opensAt, group.closesAt]).toEqual([
      state,
      null,
      null,
      null,
    ])
  },
)
