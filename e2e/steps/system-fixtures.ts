import type { APIResponse } from '@playwright/test'
import { test as base } from './auth-fixtures.js'

export type SystemState = {
  statusResponse?: APIResponse
}

export const test = base.extend<{ system: SystemState }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured first argument.
  system: async ({}, use) => {
    await use({})
  },
})
