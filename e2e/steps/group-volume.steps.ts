import { expect } from '@playwright/test'
import { createBdd, type DataTable } from 'playwright-bdd'
import { callMcpTool, postExercise } from './catalog-api.js'
import { test, volumeResponseOf } from './group-volume-fixtures.js'
import { programIdOf } from './program-fixtures.js'
import { toExerciseSlug, toLoadG, toMuscleSlug } from './program-helpers.js'
import { recordWorkout } from './workout-fixtures.js'

const { Given, When, Then } = createBdd(test)

type VolumeRow = {
  muscleGroup: { slug: string }
  volumeG: number
  previousVolumeG: number
  changePercent: number | null
  timeSeconds: number
}

Given(
  'these exercises are registered with secondary muscles:',
  async ({ request }, table: DataTable) => {
    for (const row of table.hashes()) {
      const response = await postExercise(request, {
        name: row.exercise ?? '',
        kind: row.kind ?? '',
        primaryMuscleSlugs: [await toMuscleSlug(request, row.primary ?? '')],
        secondaryMuscleSlugs: row.secondary ? [await toMuscleSlug(request, row.secondary)] : [],
      })
      // Scenarios share one database, so a previous run of this feature may have registered it.
      const accepted =
        response.status() === 201 ||
        (response.status() === 409 &&
          ((await response.json()) as { code?: string }).code === 'exercise_already_exists')

      expect(accepted).toBe(true)
    }
  },
)

Given(
  '{int} sets of {string} of {int} reps with {string} are recorded on {string}',
  async (
    { request, program },
    count: number,
    name: string,
    reps: number,
    load: string,
    at: string,
  ) => {
    const exerciseSlug = await toExerciseSlug(request, name)
    const sets = Array.from({ length: count }, () => ({
      exerciseSlug,
      loadG: toLoadG(load),
      reps,
    }))
    recordWorkout(programIdOf(program), 'A', sets, at)
  },
)

Given(
  '{int} sets of {string} of {int} seconds are recorded on {string}',
  async ({ request, program }, count: number, name: string, seconds: number, at: string) => {
    const exerciseSlug = await toExerciseSlug(request, name)
    const sets = Array.from({ length: count }, () => ({ exerciseSlug, loadG: 0, seconds }))
    recordWorkout(programIdOf(program), 'A', sets, at)
  },
)

When(
  'the planner asks for the muscle group volume from {string} to {string} through MCP',
  async ({ request, groupVolume }, from: string, to: string) => {
    groupVolume.response = await callMcpTool(request, 'get_muscle_group_volume', { from, to })
  },
)

async function groupOf(response: Awaited<ReturnType<typeof volumeResponseOf>>, slug: string) {
  const body = (await response.json()) as {
    result?: { isError?: boolean; structuredContent?: { groups: VolumeRow[] } }
  }
  expect(body.result?.isError).toBeFalsy()
  const group = body.result?.structuredContent?.groups.find((row) => row.muscleGroup.slug === slug)
  expect(group).toBeDefined()
  return group as VolumeRow
}

Then(
  'the group {string} should have a volume of {string}',
  async ({ groupVolume }, slug: string, volume: string) => {
    const group = await groupOf(volumeResponseOf(groupVolume), slug)

    expect(group.volumeG).toBe(toLoadG(volume))
  },
)

Then(
  'the group {string} should have a previous volume of {string} and a change of {int} percent',
  async ({ groupVolume }, slug: string, previous: string, percent: number) => {
    const group = await groupOf(volumeResponseOf(groupVolume), slug)

    expect({ previousVolumeG: group.previousVolumeG, changePercent: group.changePercent }).toEqual({
      previousVolumeG: toLoadG(previous),
      changePercent: percent,
    })
  },
)

Then(
  'the group {string} should have {int} seconds and no volume',
  async ({ groupVolume }, slug: string, seconds: number) => {
    const group = await groupOf(volumeResponseOf(groupVolume), slug)

    expect({ timeSeconds: group.timeSeconds, volumeG: group.volumeG }).toEqual({
      timeSeconds: seconds,
      volumeG: 0,
    })
  },
)
