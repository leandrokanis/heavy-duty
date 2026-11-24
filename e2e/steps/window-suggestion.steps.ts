import { expect } from '@playwright/test'
import { createBdd, type DataTable } from 'playwright-bdd'
import { postPlannedExercise } from './catalog-api.js'
import { test } from './group-window-fixtures.js'
import { programIdOf } from './program-fixtures.js'
import { addDay, createProgram, toExerciseSlug, toLoadG, toTarget } from './program-helpers.js'
import { recordWorkout } from './workout-fixtures.js'

const { Given } = createBdd(test)

const HOUR_MS = 60 * 60 * 1000

Given(
  'an active program with goal {string} and these days:',
  async ({ request, program }, goal: string, table: DataTable) => {
    await createProgram(request, program, 'Programa do dia', goal)
    const rows = table.hashes()
    program.letter = rows[0]?.day ?? 'A'
    for (const letter of new Set(rows.map((row) => row.day ?? ''))) {
      expect((await addDay(request, program, letter)).status()).toBe(201)
    }
    for (const row of rows) {
      const { targetReps, targetSeconds } = toTarget(row.target ?? '')
      const response = await postPlannedExercise(request, programIdOf(program), row.day ?? '', {
        exerciseSlug: await toExerciseSlug(request, row.exercise ?? ''),
        sets: Number(row.sets),
        ...(targetReps === null ? { targetSeconds } : { targetReps }),
        loadG: toLoadG(row.load ?? ''),
        restSeconds: Number(row.rest),
      })
      expect(response.status()).toBe(201)
    }
  },
)

// The letter of the workout sets the program sequence, and the API runs with the real clock.
Given(
  '{int} sets of {string} of {int} reps with {string} are recorded {int} hour(s) ago on the day {string}',
  async (
    { request, program },
    count: number,
    name: string,
    reps: number,
    load: string,
    hours: number,
    letter: string,
  ) => {
    const exerciseSlug = await toExerciseSlug(request, name)
    const sets = Array.from({ length: count }, () => ({
      exerciseSlug,
      loadG: toLoadG(load),
      reps,
    }))
    recordWorkout(
      programIdOf(program),
      letter,
      sets,
      new Date(Date.now() - hours * HOUR_MS).toISOString(),
    )
  },
)
