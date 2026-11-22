import type { APIResponse } from '@playwright/test'
import { test as base } from './program-fixtures.js'

export type GroupVolumeState = { response?: APIResponse }

// Extends the program fixtures, which already carry the session cookie and the MCP credential.
export const test = base.extend<{ groupVolume: GroupVolumeState }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured first argument.
  groupVolume: async ({}, use) => {
    await use({})
  },
})

export function volumeResponseOf(state: GroupVolumeState): APIResponse {
  if (!state.response) {
    throw new Error('No get_muscle_group_volume answer was recorded by a previous step')
  }
  return state.response
}
