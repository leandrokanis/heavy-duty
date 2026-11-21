import { describe, expect, it } from 'vitest'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'
import type { Today } from './workouts.schemas.js'

type App = ProgramTestApp['app']

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const SET_ID = '0193a1b2-0000-7000-8000-000000000501'
const STARTED_AT = '2026-11-21T18:30:00.000Z'
const PERFORMED_AT = '2026-11-21T18:31:05.000Z'
const SKIPPED_AT = '2026-11-21T18:40:00.000Z'

function sendJson(app: App, path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

type Fixture = {
  testApp: ProgramTestApp
  programId: string
  prancha: { plannedExerciseId: string; exerciseId: string }
}

// Active program with letter 'A' (supino-reto 3 x 10, prancha 3 x 45 s) and letter 'B'
// (supino-reto), with one recorded set of supino-reto that creates the workout.
async function givenWorkoutCreatedByItsFirstSet(): Promise<Fixture> {
  const testApp = createProgramTestApp()
  const { app } = testApp
  const created = await sendJson(app, '/api/programs', { name: 'Programa 1', goal: 'hypertrophy' })
  const programId = ((await created.json()) as { id: string }).id
  await sendJson(app, `/api/programs/${programId}/days`, { letter: 'A' })
  await sendJson(app, `/api/programs/${programId}/days`, { letter: 'B' })
  await sendJson(app, `/api/programs/${programId}/days/A/exercises`, {
    exerciseSlug: 'supino-reto',
    sets: 3,
    targetReps: 10,
    loadG: 40000,
    restSeconds: 90,
  })
  await sendJson(app, `/api/programs/${programId}/days/A/exercises`, {
    exerciseSlug: 'prancha',
    sets: 3,
    targetSeconds: 45,
    loadG: 0,
    restSeconds: 60,
  })
  await sendJson(app, `/api/programs/${programId}/days/B/exercises`, {
    exerciseSlug: 'supino-reto',
    sets: 3,
    targetReps: 8,
    loadG: 50000,
    restSeconds: 90,
  })
  const today = (await (await app.request('/api/today')).json()) as Today
  const dayA = today.days.find((day) => day.letter === 'A')
  const supino = dayA?.exercises[0]
  const prancha = dayA?.exercises[1]
  if (!supino || !prancha) {
    throw new Error('Missing planned exercises in fixture')
  }
  await sendJson(app, `/api/workouts/${WORKOUT_ID}/sets`, {
    id: SET_ID,
    workout: { programId, letter: 'A', startedAt: STARTED_AT },
    plannedExerciseId: supino.plannedExerciseId,
    exerciseId: supino.exercise.id,
    setNumber: 1,
    loadG: 40000,
    reps: 10,
    performedAt: PERFORMED_AT,
  })
  return {
    testApp,
    programId,
    prancha: { plannedExerciseId: prancha.plannedExerciseId, exerciseId: prancha.exercise.id },
  }
}

function postSkip(testApp: ProgramTestApp, body: unknown, workoutId: string = WORKOUT_ID) {
  return sendJson(testApp.app, `/api/workouts/${workoutId}/skips`, body)
}

function readSkipRows(testApp: ProgramTestApp) {
  return testApp.db.$client
    .prepare(
      `SELECT workout_id AS workoutId, exercise_id AS exerciseId,
              planned_exercise_id AS plannedExerciseId, skipped_at AS skippedAt
       FROM workout_skips ORDER BY exercise_id`,
    )
    .all()
}

describe('Given a workout created by its first set', () => {
  describe('When POST /api/workouts/{workoutId}/skips arrives with the planned exercise of prancha and a skippedAt after the start', () => {
    it('Then should respond 201 with the skip and store workout_id, exercise_id, planned_exercise_id and skipped_at normalized', async () => {
      const { testApp, prancha } = await givenWorkoutCreatedByItsFirstSet()

      const response = await postSkip(testApp, {
        plannedExerciseId: prancha.plannedExerciseId,
        skippedAt: '2026-11-21T18:40:00Z',
      })

      const expected = {
        workoutId: WORKOUT_ID,
        exerciseId: prancha.exerciseId,
        plannedExerciseId: prancha.plannedExerciseId,
        skippedAt: SKIPPED_AT,
      }
      expect({
        status: response.status,
        body: await response.json(),
        rows: readSkipRows(testApp),
      }).toEqual({ status: 201, body: expected, rows: [expected] })
    })
  })
})

async function givenPranchaSkipped(): Promise<Fixture> {
  const fixture = await givenWorkoutCreatedByItsFirstSet()
  await postSkip(fixture.testApp, {
    plannedExerciseId: fixture.prancha.plannedExerciseId,
    skippedAt: SKIPPED_AT,
  })
  return fixture
}

describe('Given prancha already skipped in the workout at an instant', () => {
  describe.each([
    ['the same instant', SKIPPED_AT],
    ['the same instant without milliseconds', '2026-11-21T18:40:00Z'],
  ])('When the same skip arrives again with %s', (_name, skippedAt) => {
    it('Then should respond 200 with the stored skip and change nothing', async () => {
      const { testApp, prancha } = await givenPranchaSkipped()
      const before = readSkipRows(testApp)

      const response = await postSkip(testApp, {
        plannedExerciseId: prancha.plannedExerciseId,
        skippedAt,
      })

      expect({
        status: response.status,
        body: await response.json(),
        rows: readSkipRows(testApp),
      }).toEqual({ status: 200, body: before[0], rows: before })
    })
  })

  describe('When the skip arrives again with another instant', () => {
    it('Then should respond 409 workout_skip_conflict and keep the first instant', async () => {
      const { testApp, prancha } = await givenPranchaSkipped()
      const before = readSkipRows(testApp)

      const response = await postSkip(testApp, {
        plannedExerciseId: prancha.plannedExerciseId,
        skippedAt: '2026-11-21T18:41:00.000Z',
      })

      expect({
        status: response.status,
        body: await response.json(),
        rows: readSkipRows(testApp),
      }).toEqual({
        status: 409,
        body: {
          code: 'workout_skip_conflict',
          message: 'exercício já pulado neste treino com outro instante',
        },
        rows: before,
      })
    })
  })

  describe('When the planner removes prancha from the letter and the same skip arrives again', () => {
    it('Then should respond 422 planned_exercise_not_found and keep the one stored row', async () => {
      const { testApp, prancha } = await givenPranchaSkipped()
      testApp.db.$client
        .prepare('DELETE FROM planned_exercises WHERE id = ?')
        .run(prancha.plannedExerciseId)
      const before = readSkipRows(testApp)

      const response = await postSkip(testApp, {
        plannedExerciseId: prancha.plannedExerciseId,
        skippedAt: SKIPPED_AT,
      })

      expect({
        status: response.status,
        code: ((await response.json()) as { code: string }).code,
        rows: readSkipRows(testApp),
      }).toEqual({
        status: 422,
        code: 'planned_exercise_not_found',
        rows: before,
      })
    })
  })

  describe('When the planner puts prancha back on the letter and the new planned exercise is skipped', () => {
    it('Then should respond 409 workout_skip_conflict because the exercise is already skipped', async () => {
      const { testApp, programId, prancha } = await givenPranchaSkipped()
      testApp.db.$client
        .prepare('DELETE FROM planned_exercises WHERE id = ?')
        .run(prancha.plannedExerciseId)
      await sendJson(testApp.app, `/api/programs/${programId}/days/A/exercises`, {
        exerciseSlug: 'prancha',
        sets: 3,
        targetSeconds: 45,
        loadG: 0,
        restSeconds: 60,
      })
      const today = (await (await testApp.app.request('/api/today')).json()) as Today
      const again = today.days
        .find((day) => day.letter === 'A')
        ?.exercises.find((exercise) => exercise.exercise.slug === 'prancha')
      const before = readSkipRows(testApp)

      const response = await postSkip(testApp, {
        plannedExerciseId: again?.plannedExerciseId,
        skippedAt: SKIPPED_AT,
      })

      expect({
        status: response.status,
        code: ((await response.json()) as { code: string }).code,
        rows: readSkipRows(testApp),
      }).toEqual({ status: 409, code: 'workout_skip_conflict', rows: before })
    })
  })
})

const UNKNOWN_WORKOUT_ID = '0193a1b2-0000-7000-8000-0000000006ff'
const UNKNOWN_PLANNED_ID = '0193a1b2-0000-7000-8000-0000000004ff'

type SkipBody = (fixture: Fixture) => unknown

describe.each<[name: string, workoutId: string, body: SkipBody, status: number, code: string]>([
  [
    'no workout with the id',
    UNKNOWN_WORKOUT_ID,
    (f) => ({ plannedExerciseId: f.prancha.plannedExerciseId, skippedAt: SKIPPED_AT }),
    404,
    'workout_not_found',
  ],
  [
    'a planned exercise that does not exist',
    WORKOUT_ID,
    () => ({ plannedExerciseId: UNKNOWN_PLANNED_ID, skippedAt: SKIPPED_AT }),
    422,
    'planned_exercise_not_found',
  ],
  [
    'an instant without the Z',
    WORKOUT_ID,
    (f) => ({ plannedExerciseId: f.prancha.plannedExerciseId, skippedAt: '2026-11-21T18:40:00' }),
    400,
    'workout_skipped_at_invalid',
  ],
  [
    'an instant that is not a date',
    WORKOUT_ID,
    (f) => ({ plannedExerciseId: f.prancha.plannedExerciseId, skippedAt: '2026-13-45T99:99:99Z' }),
    400,
    'workout_skipped_at_invalid',
  ],
  [
    'an instant before the start',
    WORKOUT_ID,
    (f) => ({
      plannedExerciseId: f.prancha.plannedExerciseId,
      skippedAt: '2026-11-21T18:29:59.999Z',
    }),
    400,
    'workout_skipped_before_start',
  ],
  [
    'a body without the planned exercise',
    WORKOUT_ID,
    () => ({ skippedAt: SKIPPED_AT }),
    400,
    'invalid_request',
  ],
  [
    'a planned exercise that is not a UUID',
    WORKOUT_ID,
    () => ({ plannedExerciseId: 'prancha', skippedAt: SKIPPED_AT }),
    400,
    'invalid_request',
  ],
  [
    'an invalid instant for a workout that does not exist',
    UNKNOWN_WORKOUT_ID,
    (f) => ({ plannedExerciseId: f.prancha.plannedExerciseId, skippedAt: 'yesterday' }),
    400,
    'workout_skipped_at_invalid',
  ],
  [
    'a planned exercise that does not exist and an instant before the start',
    WORKOUT_ID,
    () => ({ plannedExerciseId: UNKNOWN_PLANNED_ID, skippedAt: '2026-11-21T18:00:00.000Z' }),
    422,
    'planned_exercise_not_found',
  ],
])(
  'Given a workout created by its first set and a skip with %s',
  (_name, workoutId, body, status, code) => {
    describe('When the skip arrives', () => {
      it(`Then should respond ${status} ${code} and leave workout_skips untouched`, async () => {
        const fixture = await givenWorkoutCreatedByItsFirstSet()

        const response = await postSkip(fixture.testApp, body(fixture), workoutId)

        expect({
          status: response.status,
          code: ((await response.json()) as { code: string }).code,
          rows: readSkipRows(fixture.testApp),
        }).toEqual({ status, code, rows: [] })
      })
    })
  },
)

describe('Given a workout of letter A and a planned exercise of letter B', () => {
  describe('When the skip arrives with the exercise of the other letter and an instant before the start', () => {
    it('Then should respond 422 planned_exercise_not_found before the time rule', async () => {
      const fixture = await givenWorkoutCreatedByItsFirstSet()
      const today = (await (await fixture.testApp.app.request('/api/today')).json()) as Today
      const letterB = today.days.find((day) => day.letter === 'B')?.exercises[0]

      const response = await postSkip(fixture.testApp, {
        plannedExerciseId: letterB?.plannedExerciseId,
        skippedAt: '2026-11-21T18:00:00.000Z',
      })

      expect({
        status: response.status,
        code: ((await response.json()) as { code: string }).code,
        rows: readSkipRows(fixture.testApp),
      }).toEqual({ status: 422, code: 'planned_exercise_not_found', rows: [] })
    })
  })

  describe('When the skip arrives with an instant equal to the start', () => {
    it('Then should respond 201 and store it', async () => {
      const fixture = await givenWorkoutCreatedByItsFirstSet()

      const response = await postSkip(fixture.testApp, {
        plannedExerciseId: fixture.prancha.plannedExerciseId,
        skippedAt: STARTED_AT,
      })

      expect({ status: response.status, rows: readSkipRows(fixture.testApp).length }).toEqual({
        status: 201,
        rows: 1,
      })
    })
  })
})
