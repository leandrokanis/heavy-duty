import { type APIResponse, expect } from '@playwright/test'
import { test as base, createBdd, type DataTable } from 'playwright-bdd'
import { API_BASE_URL, callMcpTool, type MuscleBody, postMuscle } from './catalog-api.js'

type CatalogState = { lastResponse?: APIResponse; muscleList?: APIResponse }

export const test = base.extend<{ catalog: CatalogState }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured first argument.
  catalog: async ({}, use) => {
    await use({})
  },
})

const { Given, When, Then } = createBdd(test)

function lastResponseOf(catalog: CatalogState): APIResponse {
  if (!catalog.lastResponse) {
    throw new Error('No API response was recorded by a previous step')
  }
  return catalog.lastResponse
}

Given('the catalog has the 11 muscle groups of D30', async ({ request }) => {
  const response = await request.get(`${API_BASE_URL}/api/muscle-groups`)
  const body = (await response.json()) as { muscleGroups: unknown[] }

  expect(body.muscleGroups).toHaveLength(11)
})

When(
  'the planner registers the muscle {string} in the group {string}',
  async ({ request, catalog }, name: string, muscleGroupSlug: string) => {
    catalog.lastResponse = await postMuscle(request, { name, muscleGroupSlug })
  },
)

When(
  'the planner registers the muscle {string} without a muscle group',
  async ({ request, catalog }, name: string) => {
    catalog.lastResponse = await postMuscle(request, { name })
  },
)

Given(
  'the planner registered the muscle {string} in the group {string} through MCP',
  async ({ request }, name: string, muscleGroupSlug: string) => {
    const response = await callMcpTool(request, 'add_muscle', { name, muscleGroupSlug })
    const body = (await response.json()) as { result?: { isError?: boolean } }

    expect(body.result?.isError).toBeFalsy()
  },
)

When('the planner lists the muscle groups', async ({ request, catalog }) => {
  catalog.lastResponse = await request.get(`${API_BASE_URL}/api/muscle-groups`)
})

When('the muscle list is requested over HTTP', async ({ request, catalog }) => {
  catalog.muscleList = await request.get(`${API_BASE_URL}/api/muscles`)
})

Then('the muscle should be available for exercises', async ({ catalog }) => {
  expect(lastResponseOf(catalog).status()).toBe(201)
})

Then(
  'the muscle list should show {string} linked to the group {string}',
  async ({ request, catalog }, name: string, muscleGroupName: string) => {
    const response = catalog.muscleList ?? (await request.get(`${API_BASE_URL}/api/muscles`))
    const body = (await response.json()) as { muscles: MuscleBody[] }
    const muscle = body.muscles.find((candidate) => candidate.name === name)

    expect(muscle?.muscleGroup.name).toBe(muscleGroupName)
  },
)

Then(
  'the registration should be refused with the message {string}',
  async ({ catalog }, message: string) => {
    const response = lastResponseOf(catalog)

    expect({ status: response.status(), body: await response.json() }).toEqual({
      status: 400,
      body: { code: 'muscle_group_required', message },
    })
  },
)

Then(
  'the list should have these muscle groups in order:',
  async ({ catalog }, table: DataTable) => {
    const body = (await lastResponseOf(catalog).json()) as { muscleGroups: { name: string }[] }

    expect(body.muscleGroups.map((group) => group.name)).toEqual(table.raw().flat())
  },
)
