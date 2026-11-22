import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'
import type { Today, WorkoutHistory, WorkoutSet } from './workouts.schemas.js'

type App = ProgramTestApp['app']

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const SUPINO_SET_ID = '0193a1b2-0000-7000-8000-000000000501'
const PRANCHA_SET_ID = '0193a1b2-0000-7000-8000-000000000502'
const STARTED_AT = '2026-11-21T18:30:00.000Z'
const PERFORMED_AT = '2026-11-21T18:31:05.000Z'

function sendJson(app: App, method: string, path: string, body: unknown) {
  return app.request(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

type Fixture = { testApp: ProgramTestApp; programId: string }

// Active program with letter 'A' (supino-reto 3 x 10 at 45 kg, prancha 1 x 45 s) and a workout
// created by its first supino-reto set (45.000 g, 10 reps) and one prancha set (45 s).
async function givenWorkoutWithSupinoAndPranchaSets(): Promise<Fixture> {
  const testApp = createProgramTestApp()
  const { app } = testApp
  const created = await sendJson(app, 'POST', '/api/programs', {
    name: 'Programa 1',
    goal: 'hypertrophy',
  })
  const programId = ((await created.json()) as { id: string }).id
  await sendJson(app, 'POST', `/api/programs/${programId}/days`, { letter: 'A' })
  await sendJson(app, 'POST', `/api/programs/${programId}/days/A/exercises`, {
    exerciseSlug: 'supino-reto',
    sets: 3,
    targetReps: 10,
    loadG: 45000,
    restSeconds: 90,
  })
  await sendJson(app, 'POST', `/api/programs/${programId}/days/A/exercises`, {
    exerciseSlug: 'prancha',
    sets: 1,
    targetSeconds: 45,
    loadG: 0,
    restSeconds: 60,
  })
  const today = (await (await app.request('/api/today')).json()) as Today
  const [supino, prancha] = today.days[0]?.exercises ?? []
  if (!supino || !prancha) {
    throw new Error('Missing planned exercises in fixture')
  }
  const workout = { programId, letter: 'A', startedAt: STARTED_AT }
  await sendJson(app, 'POST', `/api/workouts/${WORKOUT_ID}/sets`, {
    id: SUPINO_SET_ID,
    workout,
    plannedExerciseId: supino.plannedExerciseId,
    exerciseId: supino.exercise.id,
    setNumber: 1,
    loadG: 45000,
    reps: 10,
    performedAt: PERFORMED_AT,
  })
  await sendJson(app, 'POST', `/api/workouts/${WORKOUT_ID}/sets`, {
    id: PRANCHA_SET_ID,
    workout,
    plannedExerciseId: prancha.plannedExerciseId,
    exerciseId: prancha.exercise.id,
    setNumber: 1,
    loadG: 0,
    seconds: 45,
    performedAt: PERFORMED_AT,
  })
  return { testApp, programId }
}

function patchSet(
  testApp: ProgramTestApp,
  body: unknown,
  setId: string = SUPINO_SET_ID,
  workoutId: string = WORKOUT_ID,
) {
  return sendJson(testApp.app, 'PATCH', `/api/workouts/${workoutId}/sets/${setId}`, body)
}

type SetRow = {
  id: string
  workoutId: string
  exerciseId: string
  plannedExerciseId: string | null
  setNumber: number
  loadG: number
  reps: number | null
  seconds: number | null
  performedAt: string
}

function readSetRow(testApp: ProgramTestApp, setId: string): SetRow | undefined {
  return testApp.db.$client
    .prepare(
      `SELECT id, workout_id AS workoutId, exercise_id AS exerciseId,
              planned_exercise_id AS plannedExerciseId, set_number AS setNumber,
              load_g AS loadG, reps, seconds, performed_at AS performedAt
       FROM workout_sets WHERE id = ?`,
    )
    .get(setId) as SetRow | undefined
}

describe('Given a workout with a supino-reto set recorded at 45.000 g and 10 reps', () => {
  describe('When PATCH /api/workouts/{workoutId}/sets/{setId} arrives with loadG 42500 and reps 10', () => {
    it('Then should respond 200 with the same set at 42.500 g and store load_g 42500', async () => {
      const { testApp } = await givenWorkoutWithSupinoAndPranchaSets()
      const before = readSetRow(testApp, SUPINO_SET_ID)

      const response = await patchSet(testApp, { loadG: 42500, reps: 10 })

      expect({
        status: response.status,
        body: (await response.json()) as WorkoutSet,
        row: readSetRow(testApp, SUPINO_SET_ID),
      }).toEqual({
        status: 200,
        body: { ...before, loadG: 42500 },
        row: { ...before, loadG: 42500 },
      })
    })
  })

  describe('When the same PATCH with loadG 42500 and reps 10 arrives twice', () => {
    it('Then should respond 200 with the same body both times and leave the row as the first one left it', async () => {
      const { testApp } = await givenWorkoutWithSupinoAndPranchaSets()

      const first = await patchSet(testApp, { loadG: 42500, reps: 10 })
      const rowAfterFirst = readSetRow(testApp, SUPINO_SET_ID)
      const second = await patchSet(testApp, { loadG: 42500, reps: 10 })

      expect({
        statuses: [first.status, second.status],
        bodies: [await first.json(), await second.json()],
        row: readSetRow(testApp, SUPINO_SET_ID),
      }).toEqual({
        statuses: [200, 200],
        bodies: [rowAfterFirst, rowAfterFirst],
        row: rowAfterFirst,
      })
    })
  })

  describe('When the workout has already finished and the PATCH arrives', () => {
    it('Then should respond 200 and store the corrected load', async () => {
      const { testApp } = await givenWorkoutWithSupinoAndPranchaSets()
      await sendJson(testApp.app, 'POST', `/api/workouts/${WORKOUT_ID}/finish`, {
        finishedAt: '2026-11-21T19:20:00.000Z',
        endReason: 'completed',
      })

      const response = await patchSet(testApp, { loadG: 42500, reps: 10 })

      expect({ status: response.status, loadG: readSetRow(testApp, SUPINO_SET_ID)?.loadG }).toEqual(
        { status: 200, loadG: 42500 },
      )
    })
  })

  describe('When the PATCH corrects the prancha set to 40 s', () => {
    it('Then should store seconds 40 and keep reps null', async () => {
      const { testApp } = await givenWorkoutWithSupinoAndPranchaSets()

      await patchSet(testApp, { loadG: 0, seconds: 40 }, PRANCHA_SET_ID)

      const row = readSetRow(testApp, PRANCHA_SET_ID)
      expect({ seconds: row?.seconds, reps: row?.reps }).toEqual({ seconds: 40, reps: null })
    })
  })
})

describe('Given a workout with a supino-reto set and another workout with its own set', () => {
  const OTHER_WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000602'
  const MISSING_ID = '0193a1b2-0000-7000-8000-000000000999'

  describe.each([
    {
      case: 'a workout that does not exist',
      path: `/api/workouts/${MISSING_ID}/sets/${SUPINO_SET_ID}`,
      expected: { status: 404, code: 'workout_not_found' },
    },
    {
      case: 'a set that does not exist in the workout',
      path: `/api/workouts/${WORKOUT_ID}/sets/${MISSING_ID}`,
      expected: { status: 404, code: 'workout_set_not_found' },
    },
    {
      case: 'a set of another workout',
      path: `/api/workouts/${OTHER_WORKOUT_ID}/sets/${SUPINO_SET_ID}`,
      expected: { status: 404, code: 'workout_set_not_found' },
    },
    {
      case: 'a set id that is not a UUID',
      path: `/api/workouts/${WORKOUT_ID}/sets/not-a-uuid`,
      expected: { status: 400, code: 'invalid_request' },
    },
  ])('When the PATCH names $case', ({ path, expected }) => {
    it(`Then should respond ${expected.status} ${expected.code} and leave the row as it was`, async () => {
      const { testApp } = await givenWorkoutWithSupinoAndPranchaSets()
      await testApp.db.$client
        .prepare(
          'INSERT INTO workouts (id, program_id, letter, started_at) SELECT ?, program_id, letter, started_at FROM workouts WHERE id = ?',
        )
        .run(OTHER_WORKOUT_ID, WORKOUT_ID)
      const before = readSetRow(testApp, SUPINO_SET_ID)

      const response = await sendJson(testApp.app, 'PATCH', path, { loadG: 42500, reps: 10 })

      expect({
        status: response.status,
        code: ((await response.json()) as { code: string }).code,
        row: readSetRow(testApp, SUPINO_SET_ID),
      }).toEqual({ ...expected, row: before })
    })
  })
})

describe('Given a workout with a supino-reto set and a prancha set', () => {
  describe.each([
    {
      case: 'a negative load',
      setId: SUPINO_SET_ID,
      body: { loadG: -1, reps: 10 },
      code: 'workout_set_load_invalid',
    },
    {
      case: 'reps 0',
      setId: SUPINO_SET_ID,
      body: { loadG: 45000, reps: 0 },
      code: 'workout_set_reps_invalid',
    },
    {
      case: 'seconds on a reps exercise',
      setId: SUPINO_SET_ID,
      body: { loadG: 45000, seconds: 40 },
      code: 'workout_set_measure_invalid',
    },
    {
      case: 'reps and seconds together',
      setId: SUPINO_SET_ID,
      body: { loadG: 45000, reps: 10, seconds: 40 },
      code: 'workout_set_measure_invalid',
    },
    {
      case: 'no measure',
      setId: SUPINO_SET_ID,
      body: { loadG: 45000 },
      code: 'workout_set_measure_invalid',
    },
    {
      case: 'reps on a time exercise',
      setId: PRANCHA_SET_ID,
      body: { loadG: 0, reps: 10 },
      code: 'workout_set_measure_invalid',
    },
    {
      case: 'seconds 0 on a time exercise',
      setId: PRANCHA_SET_ID,
      body: { loadG: 0, seconds: 0 },
      code: 'workout_set_seconds_invalid',
    },
    {
      case: 'a load that is not an integer',
      setId: SUPINO_SET_ID,
      body: { loadG: 42500.5, reps: 10 },
      code: 'invalid_request',
    },
  ])('When the PATCH sends $case', ({ setId, body, code }) => {
    it(`Then should respond 400 ${code} and leave the row as it was`, async () => {
      const { testApp } = await givenWorkoutWithSupinoAndPranchaSets()
      const before = readSetRow(testApp, setId)

      const response = await patchSet(testApp, body, setId)

      expect({
        status: response.status,
        code: ((await response.json()) as { code: string }).code,
        row: readSetRow(testApp, setId),
      }).toEqual({ status: 400, code, row: before })
    })
  })
})

describe('Given a stored supino-reto set at 45.000 g and a request that fails a guard', () => {
  describe('When the PATCH arrives without the session cookie', () => {
    it('Then should respond 401 unauthenticated with no workout data and leave the row as it was', async () => {
      const { testApp } = await givenWorkoutWithSupinoAndPranchaSets()
      const before = readSetRow(testApp, SUPINO_SET_ID)
      const anonymous = createApp({ nodeEnv: 'test', databaseHealth: () => true, db: testApp.db })

      const response = await sendJson(
        anonymous,
        'PATCH',
        `/api/workouts/${WORKOUT_ID}/sets/${SUPINO_SET_ID}`,
        { loadG: 42500, reps: 10 },
      )

      expect({
        status: response.status,
        body: await response.json(),
        row: readSetRow(testApp, SUPINO_SET_ID),
      }).toEqual({
        status: 401,
        body: { code: 'unauthenticated', message: 'Entre com a sua chave de acesso.' },
        row: before,
      })
    })
  })

  describe('When the PATCH arrives with an Origin other than APP_ORIGIN', () => {
    it('Then should respond 403 forbidden_origin and leave the row as it was', async () => {
      const { testApp } = await givenWorkoutWithSupinoAndPranchaSets()
      const before = readSetRow(testApp, SUPINO_SET_ID)

      const response = await testApp.app.request(
        `/api/workouts/${WORKOUT_ID}/sets/${SUPINO_SET_ID}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
          body: JSON.stringify({ loadG: 42500, reps: 10 }),
        },
      )

      expect({
        status: response.status,
        body: await response.json(),
        row: readSetRow(testApp, SUPINO_SET_ID),
      }).toEqual({
        status: 403,
        body: { code: 'forbidden_origin', message: 'origem não permitida' },
        row: before,
      })
    })
  })
})

type HistorySetView = { loadG: number; correctedAt: string | null }

async function readSupinoFromHistory(testApp: ProgramTestApp): Promise<HistorySetView | undefined> {
  const response = await testApp.app.request(
    '/api/workouts?from=2026-11-21T00:00:00.000Z&to=2026-11-22T00:00:00.000Z',
  )
  const history = (await response.json()) as WorkoutHistory
  const supino = history.workouts[0]?.exercises.find(
    ({ exercise }) => exercise.slug === 'supino-reto',
  )
  return supino?.sets[0]
}

describe('Given a workout with a supino-reto set recorded at 45.000 g, never corrected', () => {
  describe('When the PATCH changes the load to 42.500 g at an instant T of the test clock', () => {
    it('Then GET /api/workouts should bring the set at 42500 with correctedAt equal to T', async () => {
      const { testApp } = await givenWorkoutWithSupinoAndPranchaSets()
      const instant = testApp.clock.now().toISOString()

      await patchSet(testApp, { loadG: 42500, reps: 10 })

      expect(await readSupinoFromHistory(testApp)).toMatchObject({
        loadG: 42500,
        correctedAt: instant,
      })
    })
  })

  describe('When the PATCH sends the values already stored', () => {
    it('Then GET /api/workouts should bring correctedAt null', async () => {
      const { testApp } = await givenWorkoutWithSupinoAndPranchaSets()

      await patchSet(testApp, { loadG: 45000, reps: 10 })

      expect((await readSupinoFromHistory(testApp))?.correctedAt).toBeNull()
    })
  })

  describe('When the same correction arrives again after the clock advanced', () => {
    it('Then correctedAt should keep the instant of the first correction', async () => {
      const { testApp } = await givenWorkoutWithSupinoAndPranchaSets()
      const firstInstant = testApp.clock.now().toISOString()
      await patchSet(testApp, { loadG: 42500, reps: 10 })

      testApp.clock.advance(60_000)
      await patchSet(testApp, { loadG: 42500, reps: 10 })

      expect((await readSupinoFromHistory(testApp))?.correctedAt).toBe(firstInstant)
    })
  })

  describe('When a second correction with another value arrives after the clock advanced', () => {
    it('Then correctedAt should move to the instant of the second correction', async () => {
      const { testApp } = await givenWorkoutWithSupinoAndPranchaSets()
      await patchSet(testApp, { loadG: 42500, reps: 10 })

      testApp.clock.advance(60_000)
      const secondInstant = testApp.clock.now().toISOString()
      await patchSet(testApp, { loadG: 40000, reps: 10 })

      expect(await readSupinoFromHistory(testApp)).toMatchObject({
        loadG: 40000,
        correctedAt: secondInstant,
      })
    })
  })
})
