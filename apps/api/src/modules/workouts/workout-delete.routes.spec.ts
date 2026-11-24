import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { workoutSets, workoutSkips, workouts } from '../../db/schema.js'
import { createTestDatabase } from '../../test/database.js'
import { createProgramTestApp, PROGRAM_TEST_START } from '../../test/programs.js'
import { recordWorkout } from '../../test/workouts.js'

const MISSING_WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000699'

// Active program with letter 'A' (supino-reto and prancha) and one workout with two sets and one skip.
async function givenRecordedWorkout() {
  const testApp = createProgramTestApp()
  const { app, db } = testApp
  const created = await app.request('/api/programs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Programa 1', goal: 'hypertrophy' }),
  })
  const programId = ((await created.json()) as { id: string }).id
  await app.request(`/api/programs/${programId}/days`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ letter: 'A' }),
  })
  for (const body of [
    { exerciseSlug: 'supino-reto', sets: 3, targetReps: 10, loadG: 40000, restSeconds: 90 },
    { exerciseSlug: 'prancha', sets: 3, targetSeconds: 45, loadG: 0, restSeconds: 60 },
  ]) {
    await app.request(`/api/programs/${programId}/days/A/exercises`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
  const workoutId = recordWorkout(
    db,
    {
      programId,
      letter: 'A',
      startedAt: '2026-11-21T18:30:00.000Z',
      skippedExerciseSlugs: ['prancha'],
      sets: [
        { exerciseSlug: 'supino-reto', loadG: 40000, reps: 10 },
        { exerciseSlug: 'supino-reto', loadG: 40000, reps: 10 },
      ],
    },
    PROGRAM_TEST_START,
  )
  return { ...testApp, workoutId }
}

describe('Given a recorded workout with two sets and one exercise left out', () => {
  describe('When DELETE /api/workouts/{workoutId} arrives with a session', () => {
    it('Then should respond 204 with no body and remove the workout, its sets and its skips', async () => {
      const { app, db, workoutId } = await givenRecordedWorkout()

      const response = await app.request(`/api/workouts/${workoutId}`, { method: 'DELETE' })

      expect({
        status: response.status,
        body: await response.text(),
        workouts: db.select().from(workouts).where(eq(workouts.id, workoutId)).all(),
        sets: db.select().from(workoutSets).where(eq(workoutSets.workoutId, workoutId)).all(),
        skips: db.select().from(workoutSkips).where(eq(workoutSkips.workoutId, workoutId)).all(),
      }).toEqual({ status: 204, body: '', workouts: [], sets: [], skips: [] })
    })
  })

  describe('When DELETE /api/workouts/{workoutId} arrives twice', () => {
    it('Then the second should respond 404 with code workout_not_found', async () => {
      const { app, workoutId } = await givenRecordedWorkout()
      await app.request(`/api/workouts/${workoutId}`, { method: 'DELETE' })

      const response = await app.request(`/api/workouts/${workoutId}`, { method: 'DELETE' })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 404,
        body: { code: 'workout_not_found', message: 'treino não encontrado' },
      })
    })
  })

  describe('When DELETE /api/workouts/{workoutId} arrives from another origin', () => {
    it('Then should respond 403 with code forbidden_origin and keep the workout', async () => {
      const { app, db, workoutId } = await givenRecordedWorkout()

      const response = await app.request(`/api/workouts/${workoutId}`, {
        method: 'DELETE',
        headers: { origin: 'https://evil.example' },
      })

      expect({
        status: response.status,
        kept: db.select().from(workouts).where(eq(workouts.id, workoutId)).all().length,
      }).toEqual({ status: 403, kept: 1 })
    })
  })
})

describe('Given no workout with the id', () => {
  describe('When DELETE /api/workouts/{workoutId} arrives with a session', () => {
    it('Then should respond 404 with code workout_not_found', async () => {
      const { app } = createProgramTestApp()

      const response = await app.request(`/api/workouts/${MISSING_WORKOUT_ID}`, {
        method: 'DELETE',
      })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 404,
        body: { code: 'workout_not_found', message: 'treino não encontrado' },
      })
    })
  })

  describe('When DELETE /api/workouts/{workoutId} has an id that is not a UUID', () => {
    it('Then should respond 400 with code invalid_request', async () => {
      const { app } = createProgramTestApp()

      const response = await app.request('/api/workouts/not-a-uuid', { method: 'DELETE' })

      expect({
        status: response.status,
        code: ((await response.json()) as { code: string }).code,
      }).toEqual({ status: 400, code: 'invalid_request' })
    })
  })
})

describe('Given no session cookie', () => {
  describe('When DELETE /api/workouts/{workoutId} arrives', () => {
    it('Then should respond 401 with no workout data', async () => {
      const app = createApp({
        nodeEnv: 'test',
        databaseHealth: () => true,
        db: createTestDatabase(),
      })

      const response = await app.request(`/api/workouts/${MISSING_WORKOUT_ID}`, {
        method: 'DELETE',
      })

      expect(response.status).toBe(401)
    })
  })
})
