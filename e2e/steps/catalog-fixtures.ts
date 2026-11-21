import type { APIResponse } from '@playwright/test'
import { test as base } from 'playwright-bdd'

export type CatalogState = {
  lastResponse?: APIResponse
  muscleList?: APIResponse
  exerciseList?: APIResponse
}

export const test = base.extend<{ catalog: CatalogState }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured first argument.
  catalog: async ({}, use) => {
    await use({})
  },
})

export function lastResponseOf(catalog: CatalogState): APIResponse {
  if (!catalog.lastResponse) {
    throw new Error('No API response was recorded by a previous step')
  }
  return catalog.lastResponse
}
