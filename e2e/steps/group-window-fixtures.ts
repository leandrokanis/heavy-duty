import type { APIResponse } from '@playwright/test'
import { test as base } from './window-simulation-fixtures.js'

export type GroupWindowState = { response?: APIResponse }

export const test = base.extend<{ groupWindow: GroupWindowState }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured first argument.
  groupWindow: async ({}, use) => {
    await use({})
  },
})

export function windowsResponseOf(state: GroupWindowState): APIResponse {
  if (!state.response) {
    throw new Error('No list_activity_windows answer was recorded by a previous step')
  }
  return state.response
}
