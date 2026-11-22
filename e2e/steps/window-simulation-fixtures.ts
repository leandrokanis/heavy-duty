import type { APIResponse } from '@playwright/test'
import { test as base } from './group-volume-fixtures.js'

export type WindowSimulationState = { response?: APIResponse }

export const test = base.extend<{ windowSimulation: WindowSimulationState }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured first argument.
  windowSimulation: async ({}, use) => {
    await use({})
  },
})

export function simulationResponseOf(state: WindowSimulationState): APIResponse {
  if (!state.response) {
    throw new Error('No simulate_activity_windows answer was recorded by a previous step')
  }
  return state.response
}
