import { type APIRequestContext, expect } from '@playwright/test'
import { createBdd, type DataTable } from 'playwright-bdd'
import {
  APP_BASE_URL,
  callMcpTool,
  type ExerciseBody,
  type MuscleBody,
  postExercise,
  postMuscle,
} from './catalog-api.js'
import { type CatalogState, lastResponseOf, test } from './catalog-fixtures.js'

const { Given, When, Then } = createBdd(test)

function splitList(names: string): string[] {
  return names
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '')
}

// The feature keeps the muscle names of the PRD; the API takes the slug it assigned.
async function toMuscleSlugs(request: APIRequestContext, names: string): Promise<string[]> {
  const response = await request.get(`${APP_BASE_URL}/api/muscles`)
  const body = (await response.json()) as { muscles: (MuscleBody & { slug: string })[] }
  return splitList(names).map((name) => {
    const muscle = body.muscles.find((candidate) => candidate.name === name)
    if (!muscle) {
      throw new Error(`Muscle "${name}" is not registered`)
    }
    return muscle.slug
  })
}

async function findListedExercise(
  request: APIRequestContext,
  catalog: CatalogState,
  name: string,
): Promise<ExerciseBody | undefined> {
  const response = catalog.exerciseList ?? (await request.get(`${APP_BASE_URL}/api/exercises`))
  const body = (await response.json()) as { exercises: ExerciseBody[] }
  return body.exercises.find((candidate) => candidate.name === name)
}

Given('these muscles are registered:', async ({ request }, table: DataTable) => {
  for (const row of table.hashes()) {
    const response = await postMuscle(request, {
      name: row.muscle ?? '',
      muscleGroupSlug: row.group ?? '',
    })
    // Scenarios share one database, so another scenario may have registered the muscle.
    const accepted =
      response.status() === 201 ||
      (response.status() === 409 &&
        ((await response.json()) as { code?: string }).code === 'muscle_already_exists')

    expect(accepted).toBe(true)
  }
})

When(
  'the planner registers the exercise {string} of kind {string} with primary muscles {string} and secondary muscles {string}',
  async ({ request, catalog }, name: string, kind: string, primary: string, secondary: string) => {
    catalog.lastResponse = await postExercise(request, {
      name,
      kind,
      primaryMuscleSlugs: await toMuscleSlugs(request, primary),
      secondaryMuscleSlugs: await toMuscleSlugs(request, secondary),
    })
  },
)

When(
  'the planner registers the exercise {string} of kind {string} without muscles',
  async ({ request, catalog }, name: string, kind: string) => {
    catalog.lastResponse = await postExercise(request, { name, kind })
  },
)

Given(
  'the planner registered the exercise {string} of kind {string} with the primary muscle {string} through MCP',
  async ({ request }, name: string, kind: string, primary: string) => {
    const response = await callMcpTool(request, 'add_exercise', {
      name,
      kind,
      primaryMuscleSlugs: await toMuscleSlugs(request, primary),
    })
    const body = (await response.json()) as { result?: { isError?: boolean } }

    expect(body.result?.isError).toBeFalsy()
  },
)

When('the exercise list is requested over HTTP', async ({ request, catalog }) => {
  catalog.exerciseList = await request.get(`${APP_BASE_URL}/api/exercises`)
})

Then('the exercise should be available for programs', async ({ catalog }) => {
  expect(lastResponseOf(catalog).status()).toBe(201)
})

Then(
  'the exercise list should show {string} linked to the groups {string}',
  async ({ request, catalog }, name: string, groups: string) => {
    const exercise = await findListedExercise(request, catalog, name)

    expect(exercise?.muscleGroups.map((group) => group.name)).toEqual(splitList(groups))
  },
)

Then(
  'the exercise list should show {string} of kind {string} linked to the groups {string}',
  async ({ request, catalog }, name: string, kind: string, groups: string) => {
    const exercise = await findListedExercise(request, catalog, name)

    expect({
      kind: exercise?.kind,
      groups: exercise?.muscleGroups.map((group) => group.name),
    }).toEqual({ kind, groups: splitList(groups) })
  },
)
