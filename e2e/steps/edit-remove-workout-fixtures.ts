import type { APIResponse } from '@playwright/test'
import { test as base } from './list-workouts-fixtures.js'

export type EditRemoveState = {
  workoutId?: string
  preview?: APIResponse
  confirmation?: APIResponse
  refusal?: APIResponse
}

// Extends the list-workouts fixtures, so the program and workout steps are reused.
export const test = base.extend<{ editRemove: EditRemoveState }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured first argument.
  editRemove: async ({}, use) => {
    await use({})
  },
})

export function responseOf(response: APIResponse | undefined, step: string): APIResponse {
  if (!response) {
    throw new Error(`No MCP answer was recorded by the step "${step}"`)
  }
  return response
}
