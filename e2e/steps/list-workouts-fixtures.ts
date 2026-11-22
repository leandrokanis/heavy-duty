import type { APIResponse } from '@playwright/test'
import { test as base } from './program-fixtures.js'

export type ListWorkoutsState = { response?: APIResponse }

// Extends the program fixtures, which already carry the session cookie and the MCP credential.
export const test = base.extend<{ listedWorkouts: ListWorkoutsState }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured first argument.
  listedWorkouts: async ({}, use) => {
    await use({})
  },
})

export function listedResponseOf(state: ListWorkoutsState): APIResponse {
  if (!state.response) {
    throw new Error('No list_workouts answer was recorded by a previous step')
  }
  return state.response
}
