import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { programDays, workoutSets, workouts } from '../../db/schema.js'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'
import type { Today } from './workouts.schemas.js'

type App = ProgramTestApp['app']

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const SET_ID = '0193a1b2-0000-7000-8000-000000000501'
const STARTED_AT = '2026-11-21T18:30:00.000Z'
const PERFORMED_AT = '2026-11-21T18:31:05.000Z'

function sendJson(app: App, method: string, path: string, body: unknown) {
  return app.request(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

type Fixture = ProgramTestApp & {
  programId: string
  supino: { plannedExerciseId: string; exerciseId: string }
  prancha: { plannedExerciseId: string; exerciseId: string }
}

// Active hypertrophy program, letter 'A' with supino-reto 3 x 10 at 40000 g, 90 s,
// and prancha 3 x 45 s at 0 g, 60 s.
async function givenProgramWithLetterA(): Promise<Fixture> {
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
    loadG: 40000,
    restSeconds: 90,
  })
  await sendJson(app, 'POST', `/api/programs/${programId}/days/A/exercises`, {
    exerciseSlug: 'prancha',
    sets: 3,
    targetSeconds: 45,
    loadG: 0,
    restSeconds: 60,
  })
  const today = (await (await app.request('/api/today')).json()) as Today
  const refOf = (slug: string) => {
    const planned = today.days[0]?.exercises.find((item) => item.exercise.slug === slug)
    if (!planned) {
      throw new Error(`Missing planned exercise in fixture: ${slug}`)
    }
    return { plannedExerciseId: planned.plannedExerciseId, exerciseId: planned.exercise.id }
  }
  return { ...testApp, programId, supino: refOf('supino-reto'), prancha: refOf('prancha') }
}

function supinoSetBody(fixture: Fixture, overrides: Record<string, unknown> = {}) {
  return {
    id: SET_ID,
    workout: { programId: fixture.programId, letter: 'A', startedAt: STARTED_AT },
    plannedExerciseId: fixture.supino.plannedExerciseId,
    exerciseId: fixture.supino.exerciseId,
    setNumber: 1,
    loadG: 40000,
    reps: 10,
    performedAt: PERFORMED_AT,
    ...overrides,
  }
}

function postSet(fixture: Fixture, body: unknown, workoutId: string = WORKOUT_ID) {
  return sendJson(fixture.app, 'POST', `/api/workouts/${workoutId}/sets`, body)
}

function readWorkoutRows(fixture: Fixture) {
  return fixture.db.select().from(workouts).all()
}

function readSetRows(fixture: Fixture) {
  return fixture.db.select().from(workoutSets).all()
}

describe("Given the active program with letter 'A' and no workout", () => {
  describe('When the app sends the first set of supino-reto at 40000 g for 10 reps', () => {
    it('Then should respond 201 with the set, create the workout of letter A and store the set', async () => {
      const fixture = await givenProgramWithLetterA()
      const day = fixture.db
        .select({ id: programDays.id })
        .from(programDays)
        .where(eq(programDays.programId, fixture.programId))
        .get()

      const response = await postSet(fixture, supinoSetBody(fixture))

      expect({
        status: response.status,
        body: await response.json(),
        workouts: readWorkoutRows(fixture),
        sets: readSetRows(fixture),
      }).toEqual({
        status: 201,
        body: {
          id: SET_ID,
          workoutId: WORKOUT_ID,
          exerciseId: fixture.supino.exerciseId,
          plannedExerciseId: fixture.supino.plannedExerciseId,
          setNumber: 1,
          loadG: 40000,
          reps: 10,
          seconds: null,
          performedAt: PERFORMED_AT,
        },
        workouts: [
          {
            id: WORKOUT_ID,
            programId: fixture.programId,
            programDayId: day?.id,
            letter: 'A',
            startedAt: STARTED_AT,
            finishedAt: null,
            endReason: null,
          },
        ],
        sets: [
          {
            id: SET_ID,
            workoutId: WORKOUT_ID,
            exerciseId: fixture.supino.exerciseId,
            plannedExerciseId: fixture.supino.plannedExerciseId,
            setNumber: 1,
            loadG: 40000,
            reps: 10,
            seconds: null,
            performedAt: PERFORMED_AT,
            correctedAt: null,
            plannedLoadG: 40000,
            targetReps: 10,
            targetSeconds: null,
          },
        ],
      })
    })
  })
})

async function givenFirstSupinoSet(): Promise<Fixture> {
  const fixture = await givenProgramWithLetterA()
  const response = await postSet(fixture, supinoSetBody(fixture))
  if (response.status !== 201) {
    throw new Error(`Fixture set not recorded: ${response.status}`)
  }
  return fixture
}

describe('Given the first set of supino-reto recorded with id X', () => {
  describe('When the app sends set X again with the same values and another performedAt', () => {
    it('Then should respond 200 with the stored set and keep one workout and one set', async () => {
      const fixture = await givenFirstSupinoSet()

      const response = await postSet(
        fixture,
        supinoSetBody(fixture, { performedAt: '2026-11-21T18:40:00.000Z' }),
      )

      expect({
        status: response.status,
        body: await response.json(),
        workouts: readWorkoutRows(fixture).length,
        sets: readSetRows(fixture).length,
      }).toEqual({
        status: 200,
        body: {
          id: SET_ID,
          workoutId: WORKOUT_ID,
          exerciseId: fixture.supino.exerciseId,
          plannedExerciseId: fixture.supino.plannedExerciseId,
          setNumber: 1,
          loadG: 40000,
          reps: 10,
          seconds: null,
          performedAt: PERFORMED_AT,
        },
        workouts: 1,
        sets: 1,
      })
    })
  })
})

const OTHER_WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000602'

describe('Given the first set of supino-reto recorded with id X, for a resend with other values', () => {
  describe.each([
    { change: 'another load', overrides: () => ({ loadG: 42500 }) },
    { change: 'other reps', overrides: () => ({ reps: 8 }) },
    { change: 'another set number', overrides: () => ({ setNumber: 2 }) },
    {
      change: 'another exercise with the same reps',
      overrides: (fixture: Fixture) => ({ ...fixture.prancha }),
    },
    { change: 'seconds besides the reps', overrides: () => ({ seconds: 45 }) },
    {
      change: 'another planned exercise of the letter',
      overrides: (fixture: Fixture) => ({ ...fixture.prancha, reps: undefined, seconds: 45 }),
    },
  ])('When the app sends set X with $change', ({ overrides }) => {
    it('Then should respond 409 workout_set_id_conflict and keep the stored set', async () => {
      const fixture = await givenFirstSupinoSet()
      const before = readSetRows(fixture)

      const response = await postSet(fixture, supinoSetBody(fixture, overrides(fixture)))

      expect({
        status: response.status,
        body: await response.json(),
        sets: readSetRows(fixture),
      }).toEqual({
        status: 409,
        body: {
          code: 'workout_set_id_conflict',
          message: 'série já registrada com outros valores',
        },
        sets: before,
      })
    })
  })

  describe('When the app sends set X with the same values to another workout id', () => {
    it('Then should respond 409 workout_set_id_conflict, keep the set and not create the other workout', async () => {
      const fixture = await givenFirstSupinoSet()
      const before = { workouts: readWorkoutRows(fixture), sets: readSetRows(fixture) }

      const response = await postSet(fixture, supinoSetBody(fixture), OTHER_WORKOUT_ID)

      expect({
        status: response.status,
        body: await response.json(),
        workouts: readWorkoutRows(fixture),
        sets: readSetRows(fixture),
      }).toEqual({
        status: 409,
        body: {
          code: 'workout_set_id_conflict',
          message: 'série já registrada com outros valores',
        },
        ...before,
      })
    })
  })
})

const SECOND_SET_ID = '0193a1b2-0000-7000-8000-000000000502'

describe('Given the first set of supino-reto recorded in workout W', () => {
  describe('When the app sends set 2 of supino-reto with another id and the same workout data', () => {
    it('Then should respond 201 and keep one workout with two sets', async () => {
      const fixture = await givenFirstSupinoSet()

      const response = await postSet(
        fixture,
        supinoSetBody(fixture, { id: SECOND_SET_ID, setNumber: 2 }),
      )

      expect({
        status: response.status,
        workouts: readWorkoutRows(fixture).map(({ id }) => id),
        sets: readSetRows(fixture).map(({ workoutId, setNumber }) => ({ workoutId, setNumber })),
      }).toEqual({
        status: 201,
        workouts: [WORKOUT_ID],
        sets: [
          { workoutId: WORKOUT_ID, setNumber: 1 },
          { workoutId: WORKOUT_ID, setNumber: 2 },
        ],
      })
    })
  })
})

async function createOtherProgram(fixture: Fixture): Promise<string> {
  const response = await sendJson(fixture.app, 'POST', '/api/programs', {
    name: 'Programa 2',
    goal: 'strength',
  })
  return ((await response.json()) as { id: string }).id
}

describe('Given workout W created by the first set of supino-reto', () => {
  describe.each([
    {
      change: 'another existing program',
      workout: async (fixture: Fixture) => ({
        programId: await createOtherProgram(fixture),
        letter: 'A',
        startedAt: STARTED_AT,
      }),
    },
    {
      change: 'another letter',
      workout: async (fixture: Fixture) => ({
        programId: fixture.programId,
        letter: 'B',
        startedAt: STARTED_AT,
      }),
    },
    {
      change: 'another start',
      workout: async (fixture: Fixture) => ({
        programId: fixture.programId,
        letter: 'A',
        startedAt: '2026-11-21T18:30:01.000Z',
      }),
    },
  ])('When a new set arrives for W with $change', ({ workout }) => {
    it('Then should respond 409 workout_conflict and keep the workout and its sets', async () => {
      const fixture = await givenFirstSupinoSet()
      const otherWorkout = await workout(fixture)
      const before = { workouts: readWorkoutRows(fixture), sets: readSetRows(fixture) }

      const response = await postSet(
        fixture,
        supinoSetBody(fixture, { id: SECOND_SET_ID, setNumber: 2, workout: otherWorkout }),
      )

      expect({
        status: response.status,
        body: await response.json(),
        workouts: readWorkoutRows(fixture),
        sets: readSetRows(fixture),
      }).toEqual({
        status: 409,
        body: { code: 'workout_conflict', message: 'treino já registrado com outros dados' },
        ...before,
      })
    })
  })

  describe('When set 2 arrives with the same start written without milliseconds', () => {
    it('Then should respond 201, as the same start', async () => {
      const fixture = await givenFirstSupinoSet()

      const response = await postSet(
        fixture,
        supinoSetBody(fixture, {
          id: SECOND_SET_ID,
          setNumber: 2,
          workout: { programId: fixture.programId, letter: 'A', startedAt: '2026-11-21T18:30:00Z' },
        }),
      )

      expect(response.status).toBe(201)
    })
  })
})

describe('Given set 1 of supino-reto recorded in workout W', () => {
  describe('When another set with another id arrives for W, supino-reto and set number 1', () => {
    it('Then should respond 409 workout_set_duplicated and keep one set', async () => {
      const fixture = await givenFirstSupinoSet()
      const before = readSetRows(fixture)

      const response = await postSet(fixture, supinoSetBody(fixture, { id: SECOND_SET_ID }))

      expect({
        status: response.status,
        body: await response.json(),
        sets: readSetRows(fixture),
      }).toEqual({
        status: 409,
        body: { code: 'workout_set_duplicated', message: 'série já registrada neste treino' },
        sets: before,
      })
    })
  })
})

describe("Given the active program with letter 'A' holding prancha and no workout", () => {
  describe('When the app sends set 1 of prancha with 45 seconds and 0 g', () => {
    it('Then should respond 201 and store 45 seconds, no reps and 0 g', async () => {
      const fixture = await givenProgramWithLetterA()

      const response = await postSet(
        fixture,
        supinoSetBody(fixture, { ...fixture.prancha, loadG: 0, reps: undefined, seconds: 45 }),
      )

      expect({
        status: response.status,
        sets: readSetRows(fixture).map(({ loadG, reps, seconds }) => ({ loadG, reps, seconds })),
      }).toEqual({ status: 201, sets: [{ loadG: 0, reps: null, seconds: 45 }] })
    })
  })
})

const MEASURE_INVALID = {
  code: 'workout_set_measure_invalid',
  message: 'informe repetições no exercício de repetição e segundos no exercício de tempo',
}

describe("Given the active program with letter 'A', no workout and a set with an invalid value", () => {
  describe.each([
    {
      input: 'a negative load',
      overrides: () => ({ loadG: -1 }),
      error: { code: 'workout_set_load_invalid', message: 'carga inválida' },
    },
    {
      input: '0 reps',
      overrides: () => ({ reps: 0 }),
      error: { code: 'workout_set_reps_invalid', message: 'repetições inválidas' },
    },
    {
      input: '0 seconds on prancha',
      overrides: (fixture: Fixture) => ({ ...fixture.prancha, reps: undefined, seconds: 0 }),
      error: { code: 'workout_set_seconds_invalid', message: 'tempo inválido' },
    },
    {
      input: 'set number 0',
      overrides: () => ({ setNumber: 0 }),
      error: { code: 'workout_set_number_invalid', message: 'número da série inválido' },
    },
    {
      input: "letter '1'",
      overrides: (fixture: Fixture) => ({
        workout: { programId: fixture.programId, letter: '1', startedAt: STARTED_AT },
      }),
      error: { code: 'program_day_letter_invalid', message: 'a letra deve ser de A a Z' },
    },
    {
      input: 'seconds on supino-reto',
      overrides: () => ({ reps: undefined, seconds: 45 }),
      error: MEASURE_INVALID,
    },
    {
      input: 'reps on prancha',
      overrides: (fixture: Fixture) => ({ ...fixture.prancha, loadG: 0 }),
      error: MEASURE_INVALID,
    },
    {
      input: 'both measures',
      overrides: () => ({ seconds: 45 }),
      error: MEASURE_INVALID,
    },
    {
      input: 'no measure',
      overrides: () => ({ reps: undefined }),
      error: MEASURE_INVALID,
    },
    {
      input: 'the exercise of prancha with the planned exercise of supino-reto',
      overrides: (fixture: Fixture) => ({ exerciseId: fixture.prancha.exerciseId }),
      error: {
        code: 'workout_set_exercise_mismatch',
        message: 'exercício diferente do exercício do programa',
      },
    },
    {
      input: 'a set id that is not a UUID',
      overrides: () => ({ id: 'set-1' }),
      error: { code: 'invalid_request', message: 'requisição inválida' },
    },
  ])('When the app sends a set with $input', ({ overrides, error }) => {
    it('Then should respond 400 with its code and record no workout and no set', async () => {
      const fixture = await givenProgramWithLetterA()

      const response = await postSet(fixture, supinoSetBody(fixture, overrides(fixture)))

      expect({
        status: response.status,
        body: await response.json(),
        workouts: readWorkoutRows(fixture).length,
        sets: readSetRows(fixture).length,
      }).toEqual({ status: 400, body: error, workouts: 0, sets: 0 })
    })
  })

  describe("When the app sends the first set with letter 'a'", () => {
    it("Then should respond 201 and store the workout with letter 'A'", async () => {
      const fixture = await givenProgramWithLetterA()

      const response = await postSet(
        fixture,
        supinoSetBody(fixture, {
          workout: { programId: fixture.programId, letter: 'a', startedAt: STARTED_AT },
        }),
      )

      expect({
        status: response.status,
        letters: readWorkoutRows(fixture).map(({ letter }) => letter),
      }).toEqual({ status: 201, letters: ['A'] })
    })
  })
})

const MISSING_ID = '0193a1b2-0000-7000-8000-000000000999'

async function plannedExerciseOfLetterB(fixture: Fixture): Promise<string> {
  const { app, programId } = fixture
  await sendJson(app, 'POST', `/api/programs/${programId}/days`, { letter: 'B' })
  await sendJson(app, 'POST', `/api/programs/${programId}/days/B/exercises`, {
    exerciseSlug: 'supino-reto',
    sets: 3,
    targetReps: 10,
    loadG: 40000,
    restSeconds: 90,
  })
  const today = (await (await app.request('/api/today')).json()) as Today
  const planned = today.days.find((day) => day.letter === 'B')?.exercises[0]
  if (!planned) {
    throw new Error('Missing planned exercise of letter B in fixture')
  }
  return planned.plannedExerciseId
}

describe("Given the active program with letter 'A', no workout and a set with a missing reference", () => {
  describe.each([
    {
      input: 'a program that does not exist',
      overrides: async () => ({
        workout: { programId: MISSING_ID, letter: 'A', startedAt: STARTED_AT },
      }),
      error: { code: 'program_not_found', message: 'programa não encontrado' },
    },
    {
      input: "letter 'B', which the program does not have",
      overrides: async (fixture: Fixture) => ({
        workout: { programId: fixture.programId, letter: 'B', startedAt: STARTED_AT },
      }),
      error: { code: 'program_day_not_found', message: 'letra não encontrada no programa' },
    },
    {
      input: 'a planned exercise that does not exist',
      overrides: async () => ({ plannedExerciseId: MISSING_ID }),
      error: { code: 'planned_exercise_not_found', message: 'exercício não encontrado na letra' },
    },
    {
      input: "the planned exercise of supino-reto in letter 'B'",
      overrides: async (fixture: Fixture) => ({
        plannedExerciseId: await plannedExerciseOfLetterB(fixture),
      }),
      error: { code: 'planned_exercise_not_found', message: 'exercício não encontrado na letra' },
    },
  ])('When the app sends a set with $input', ({ overrides, error }) => {
    it('Then should respond 422 with its code and record no workout and no set', async () => {
      const fixture = await givenProgramWithLetterA()
      const body = supinoSetBody(fixture, await overrides(fixture))

      const response = await postSet(fixture, body)

      expect({
        status: response.status,
        body: await response.json(),
        workouts: readWorkoutRows(fixture).length,
        sets: readSetRows(fixture).length,
      }).toEqual({ status: 422, body: error, workouts: 0, sets: 0 })
    })
  })
})

const PRANCHA_SET_ID = '0193a1b2-0000-7000-8000-000000000503'

async function removeSupinoFromLetterA(fixture: Fixture) {
  await fixture.app.request(`/api/programs/${fixture.programId}/days/A/exercises/supino-reto`, {
    method: 'DELETE',
  })
}

describe('Given workout W with set 1 of supino-reto, after the planner removed supino-reto from letter A', () => {
  describe('When the app sends set 2 of supino-reto', () => {
    it('Then should respond 422 planned_exercise_not_found', async () => {
      const fixture = await givenFirstSupinoSet()
      await removeSupinoFromLetterA(fixture)

      const response = await postSet(
        fixture,
        supinoSetBody(fixture, { id: SECOND_SET_ID, setNumber: 2 }),
      )

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 422,
        body: { code: 'planned_exercise_not_found', message: 'exercício não encontrado na letra' },
      })
    })
  })

  describe('When the app sends set 1 again with the same id and values', () => {
    it('Then should respond 200 with the stored set, now without the planned exercise', async () => {
      const fixture = await givenFirstSupinoSet()
      await removeSupinoFromLetterA(fixture)

      const response = await postSet(fixture, supinoSetBody(fixture))

      expect({ status: response.status, body: await response.json() }).toMatchObject({
        status: 200,
        body: { id: SET_ID, plannedExerciseId: null },
      })
    })
  })
})

describe('Given workout W with set 1 of supino-reto, after another program became the active one', () => {
  describe('When the app sends set 1 of prancha for W', () => {
    it('Then should respond 201, as the workout keeps the program it trained', async () => {
      const fixture = await givenFirstSupinoSet()
      await createOtherProgram(fixture)

      const response = await postSet(
        fixture,
        supinoSetBody(fixture, {
          ...fixture.prancha,
          id: PRANCHA_SET_ID,
          loadG: 0,
          reps: undefined,
          seconds: 45,
        }),
      )

      expect(response.status).toBe(201)
    })
  })
})

type StoredPlan = {
  plannedLoadG: number | null
  targetReps: number | null
  targetSeconds: number | null
}

function readStoredPlan(fixture: Fixture, setId: string): StoredPlan | undefined {
  return fixture.db
    .select({
      plannedLoadG: workoutSets.plannedLoadG,
      targetReps: workoutSets.targetReps,
      targetSeconds: workoutSets.targetSeconds,
    })
    .from(workoutSets)
    .where(eq(workoutSets.id, setId))
    .get()
}

describe('Given the active program with supino-reto planned for 10 reps at 40000 g (ADR-033)', () => {
  describe('When the app sends set 1 of supino-reto', () => {
    it('Then the set should store the plan of the moment: 40000 g and 10 reps', async () => {
      const fixture = await givenProgramWithLetterA()

      await postSet(fixture, supinoSetBody(fixture, { loadG: 42500, reps: 8 }))

      expect(readStoredPlan(fixture, SET_ID)).toEqual({
        plannedLoadG: 40000,
        targetReps: 10,
        targetSeconds: null,
      })
    })
  })

  describe('When the app sends set 1 of prancha', () => {
    it('Then the set should store 0 g and 45 seconds as its plan', async () => {
      const fixture = await givenProgramWithLetterA()

      await postSet(
        fixture,
        supinoSetBody(fixture, { ...fixture.prancha, loadG: 0, reps: undefined, seconds: 30 }),
      )

      expect(readStoredPlan(fixture, SET_ID)).toEqual({
        plannedLoadG: 0,
        targetReps: null,
        targetSeconds: 45,
      })
    })
  })

  describe('When the planner changes supino-reto to 12 reps at 45000 g after set 1', () => {
    it('Then set 1 should keep the plan it was recorded with', async () => {
      const fixture = await givenProgramWithLetterA()
      await postSet(fixture, supinoSetBody(fixture))

      await sendJson(
        fixture.app,
        'PATCH',
        `/api/programs/${fixture.programId}/days/A/exercises/supino-reto`,
        { targetReps: 12, loadG: 45000 },
      )

      expect(readStoredPlan(fixture, SET_ID)).toEqual({
        plannedLoadG: 40000,
        targetReps: 10,
        targetSeconds: null,
      })
    })
  })

  describe('When the app corrects set 1 to 12 reps at 50000 g', () => {
    it('Then the set should keep its plan', async () => {
      const fixture = await givenProgramWithLetterA()
      await postSet(fixture, supinoSetBody(fixture))

      await sendJson(fixture.app, 'PATCH', `/api/workouts/${WORKOUT_ID}/sets/${SET_ID}`, {
        loadG: 50000,
        reps: 12,
      })

      expect(readStoredPlan(fixture, SET_ID)).toEqual({
        plannedLoadG: 40000,
        targetReps: 10,
        targetSeconds: null,
      })
    })
  })
})
