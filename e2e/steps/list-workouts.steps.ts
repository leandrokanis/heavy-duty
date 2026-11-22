import { expect } from '@playwright/test'
import { createBdd, type DataTable } from 'playwright-bdd'
import { callMcpTool, postPlannedExercise } from './catalog-api.js'
import { listedResponseOf, test } from './list-workouts-fixtures.js'
import { programIdOf } from './program-fixtures.js'
import { addDay, createProgram, toExerciseSlug, toLoadG } from './program-helpers.js'
import { recordWorkout } from './workout-fixtures.js'

const { Given, When, Then } = createBdd(test)

type ListedWorkout = {
  letter: string
  exercises: { exercise: { name: string }; sets: { loadG: number }[] }[]
}

Given(
  'a program with the days {string}, each with {string} at {string}',
  async ({ request, program }, days: string, name: string, load: string) => {
    await createProgram(request, program, 'Programa', 'hypertrophy')
    const exerciseSlug = await toExerciseSlug(request, name)
    for (const letter of days.split(', ')) {
      expect((await addDay(request, program, letter)).status()).toBe(201)
      const planned = await postPlannedExercise(request, programIdOf(program), letter, {
        exerciseSlug,
        sets: 3,
        targetReps: 10,
        loadG: toLoadG(load),
        restSeconds: 90,
      })
      expect(planned.status()).toBe(201)
    }
  },
)

Given(
  'these workouts are recorded, one set of {string} of 10 reps each:',
  async ({ request, program }, name: string, table: DataTable) => {
    const exerciseSlug = await toExerciseSlug(request, name)
    for (const row of table.hashes()) {
      recordWorkout(
        programIdOf(program),
        row.day ?? '',
        [{ exerciseSlug, loadG: toLoadG(row.load ?? ''), reps: 10 }],
        row.started,
      )
    }
  },
)

When(
  'the planner lists the workouts from {string} to {string} through MCP',
  async ({ request, listedWorkouts }, from: string, to: string) => {
    listedWorkouts.response = await callMcpTool(request, 'list_workouts', { from, to })
  },
)

Then(
  'the listed workouts should be, oldest first:',
  async ({ listedWorkouts }, table: DataTable) => {
    const body = (await listedResponseOf(listedWorkouts).json()) as {
      result?: { isError?: boolean; structuredContent?: { workouts: ListedWorkout[] } }
    }
    expect(body.result?.isError).toBeFalsy()
    const listed = (body.result?.structuredContent?.workouts ?? []).map((workout) => ({
      day: workout.letter,
      exercise: workout.exercises[0]?.exercise.name,
      sets: String(workout.exercises[0]?.sets.length),
      loadG: workout.exercises[0]?.sets[0]?.loadG,
    }))
    expect(listed).toEqual(
      table.hashes().map((row) => ({
        day: row.day,
        exercise: row.exercise,
        sets: row.sets,
        loadG: toLoadG(row.load ?? ''),
      })),
    )
  },
)
