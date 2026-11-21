import { describe, expect, it } from 'vitest'
import { workouts } from '../../db/schema.js'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'
import type { Today } from './workouts.schemas.js'

type App = ProgramTestApp['app']

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const SET_ID = '0193a1b2-0000-7000-8000-000000000501'
const STARTED_AT = '2026-11-21T18:30:00.000Z'
const PERFORMED_AT = '2026-11-21T18:31:05.000Z'
const FINISHED_AT = '2026-11-21T19:20:00.000Z'

function sendJson(app: App, path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Active program with letter 'A' (supino-reto 3 x 10 at 40000 g) and one recorded set,
// which creates the workout the finish route acts on.
async function givenWorkoutCreatedByItsFirstSet(): Promise<ProgramTestApp> {
  const testApp = createProgramTestApp()
  const { app } = testApp
  const created = await sendJson(app, '/api/programs', { name: 'Programa 1', goal: 'hypertrophy' })
  const programId = ((await created.json()) as { id: string }).id
  await sendJson(app, `/api/programs/${programId}/days`, { letter: 'A' })
  await sendJson(app, `/api/programs/${programId}/days/A/exercises`, {
    exerciseSlug: 'supino-reto',
    sets: 3,
    targetReps: 10,
    loadG: 40000,
    restSeconds: 90,
  })
  const today = (await (await app.request('/api/today')).json()) as Today
  const planned = today.days[0]?.exercises[0]
  if (!planned) {
    throw new Error('Missing planned exercise in fixture')
  }
  await sendJson(app, `/api/workouts/${WORKOUT_ID}/sets`, {
    id: SET_ID,
    workout: { programId, letter: 'A', startedAt: STARTED_AT },
    plannedExerciseId: planned.plannedExerciseId,
    exerciseId: planned.exercise.id,
    setNumber: 1,
    loadG: 40000,
    reps: 10,
    performedAt: PERFORMED_AT,
  })
  return testApp
}

function postFinish(testApp: ProgramTestApp, body: unknown, workoutId: string = WORKOUT_ID) {
  return sendJson(testApp.app, `/api/workouts/${workoutId}/finish`, body)
}

function readWorkoutRows(testApp: ProgramTestApp) {
  return testApp.db.select().from(workouts).all()
}

describe('Given a workout created by its first set', () => {
  describe('When POST /api/workouts/{workoutId}/finish arrives with endReason "ended_early" and a finishedAt after the start', () => {
    it('Then should respond 200 with the workout and store finished_at normalized and end_reason "ended_early"', async () => {
      const testApp = await givenWorkoutCreatedByItsFirstSet()

      const response = await postFinish(testApp, {
        finishedAt: '2026-11-21T19:20:00Z',
        endReason: 'ended_early',
      })

      const stored = readWorkoutRows(testApp)[0]
      expect({
        status: response.status,
        body: await response.json(),
        finishedAt: stored?.finishedAt,
        endReason: stored?.endReason,
      }).toEqual({
        status: 200,
        body: {
          id: WORKOUT_ID,
          programId: stored?.programId,
          letter: 'A',
          startedAt: STARTED_AT,
          finishedAt: FINISHED_AT,
          endReason: 'ended_early',
        },
        finishedAt: FINISHED_AT,
        endReason: 'ended_early',
      })
    })
  })
})

describe('Given a workout already finished as "completed" at an instant', () => {
  const finish = { finishedAt: FINISHED_AT, endReason: 'completed' }

  describe('When the same finish arrives again, even with the instant in another format', () => {
    it('Then should respond 200 with the stored workout and leave the row untouched', async () => {
      const testApp = await givenWorkoutCreatedByItsFirstSet()
      await postFinish(testApp, finish)
      const before = readWorkoutRows(testApp)

      const responses = await Promise.all([
        postFinish(testApp, finish),
        postFinish(testApp, { ...finish, finishedAt: '2026-11-21T19:20:00Z' }),
      ])

      expect({
        statuses: responses.map((response) => response.status),
        after: readWorkoutRows(testApp),
      }).toEqual({ statuses: [200, 200], after: before })
    })
  })

  describe.each([
    ['another reason', { finishedAt: FINISHED_AT, endReason: 'ended_early' }],
    ['another instant', { finishedAt: '2026-11-21T19:21:00.000Z', endReason: 'completed' }],
  ])('When a finish with %s arrives', (_name, other) => {
    it('Then should respond 409 workout_already_finished and leave the row untouched', async () => {
      const testApp = await givenWorkoutCreatedByItsFirstSet()
      await postFinish(testApp, finish)
      const before = readWorkoutRows(testApp)

      const response = await postFinish(testApp, other)

      expect({
        status: response.status,
        body: await response.json(),
        after: readWorkoutRows(testApp),
      }).toEqual({
        status: 409,
        body: {
          code: 'workout_already_finished',
          message: 'treino já encerrado com outros dados',
        },
        after: before,
      })
    })
  })
})

const UNKNOWN_WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000699'

describe.each([
  [
    'no workout with the id',
    UNKNOWN_WORKOUT_ID,
    { finishedAt: FINISHED_AT, endReason: 'completed' },
    404,
    'workout_not_found',
    'treino não encontrado',
  ],
  [
    'a reason outside the list',
    WORKOUT_ID,
    { finishedAt: FINISHED_AT, endReason: 'abandoned' },
    400,
    'workout_end_reason_invalid',
    'motivo do fim inválido',
  ],
  [
    'an instant without the Z',
    WORKOUT_ID,
    { finishedAt: '2026-11-21T19:20:00', endReason: 'completed' },
    400,
    'workout_finished_at_invalid',
    'instante do fim inválido',
  ],
  [
    'an instant with an offset other than Z',
    WORKOUT_ID,
    { finishedAt: '2026-11-21T19:20:00+00:00', endReason: 'completed' },
    400,
    'workout_finished_at_invalid',
    'instante do fim inválido',
  ],
  [
    'an instant that is not a date',
    WORKOUT_ID,
    { finishedAt: '2026-13-45T99:99:99Z', endReason: 'completed' },
    400,
    'workout_finished_at_invalid',
    'instante do fim inválido',
  ],
  [
    'an empty instant',
    WORKOUT_ID,
    { finishedAt: '', endReason: 'completed' },
    400,
    'workout_finished_at_invalid',
    'instante do fim inválido',
  ],
  [
    'an instant before the start',
    WORKOUT_ID,
    { finishedAt: '2026-11-21T18:29:59.999Z', endReason: 'completed' },
    400,
    'workout_finished_before_start',
    'o fim do treino é anterior ao início',
  ],
  [
    'a body without the reason',
    WORKOUT_ID,
    { finishedAt: FINISHED_AT },
    400,
    'invalid_request',
    'requisição inválida',
  ],
  [
    'a reason that is not a string',
    WORKOUT_ID,
    { finishedAt: FINISHED_AT, endReason: 3 },
    400,
    'invalid_request',
    'requisição inválida',
  ],
  [
    'a reason invalid for a workout that does not exist',
    UNKNOWN_WORKOUT_ID,
    { finishedAt: FINISHED_AT, endReason: 'abandoned' },
    400,
    'workout_end_reason_invalid',
    'motivo do fim inválido',
  ],
])(
  'Given a workout created by its first set and a finish with %s',
  (_name, workoutId, body, status, code, message) => {
    describe('When the finish arrives', () => {
      it(`Then should respond ${status} ${code} and leave the row untouched`, async () => {
        const testApp = await givenWorkoutCreatedByItsFirstSet()
        const before = readWorkoutRows(testApp)

        const response = await postFinish(testApp, body, workoutId)

        expect({
          status: response.status,
          body: await response.json(),
          after: readWorkoutRows(testApp),
        }).toEqual({ status, body: { code, message }, after: before })
      })
    })
  },
)

describe('Given a workout created by its first set, for the edges of the time rule', () => {
  describe('When a finish arrives with an instant equal to the start', () => {
    it('Then should respond 200 and store it', async () => {
      const testApp = await givenWorkoutCreatedByItsFirstSet()

      const response = await postFinish(testApp, { finishedAt: STARTED_AT, endReason: 'completed' })

      expect({
        status: response.status,
        finishedAt: readWorkoutRows(testApp)[0]?.finishedAt,
      }).toEqual({ status: 200, finishedAt: STARTED_AT })
    })
  })

  describe('When a finish with another instant arrives for a workout finished earlier', () => {
    it('Then should respond 409 even when that instant is before the start', async () => {
      const testApp = await givenWorkoutCreatedByItsFirstSet()
      await postFinish(testApp, { finishedAt: FINISHED_AT, endReason: 'completed' })

      const response = await postFinish(testApp, {
        finishedAt: '2026-11-21T18:00:00.000Z',
        endReason: 'completed',
      })

      expect({
        status: response.status,
        code: ((await response.json()) as { code: string }).code,
      }).toEqual({
        status: 409,
        code: 'workout_already_finished',
      })
    })
  })
})
