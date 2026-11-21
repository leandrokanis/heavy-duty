import { describe, expect, it } from 'vitest'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'

type App = ProgramTestApp['app']

function postJson(app: App, path: string, body: Record<string, unknown>) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function getJson(app: App, path: string): Promise<unknown> {
  const response = await app.request(path)
  return response.json()
}

describe('Given a signed-in app with a fixed clock', () => {
  describe("When POST /api/programs creates 'Programa 1' with goal hypertrophy", () => {
    it('Then should respond 201 with the active program and GET /api/programs/{id} should return it', async () => {
      const { app } = createProgramTestApp()

      const created = await postJson(app, '/api/programs', {
        name: 'Programa 1',
        goal: 'hypertrophy',
      })
      const body = (await created.json()) as { id: string }
      const fetched = await getJson(app, `/api/programs/${body.id}`)
      const expected = {
        id: expect.any(String),
        name: 'Programa 1',
        goal: 'hypertrophy',
        isActive: true,
        createdAt: '2026-11-21T10:00:00.000Z',
        days: [],
      }

      expect({ status: created.status, body, fetched }).toEqual({
        status: 201,
        body: expected,
        fetched: expected,
      })
    })
  })
})

describe("Given an active 'Programa 1'", () => {
  describe("When POST /api/programs creates 'Programa 2'", () => {
    it("Then 'Programa 2' should be active and 'Programa 1' should stay stored but inactive", async () => {
      const { app, clock } = createProgramTestApp()
      const first = (await (
        await postJson(app, '/api/programs', { name: 'Programa 1', goal: 'hypertrophy' })
      ).json()) as { id: string }
      clock.advance(60_000)

      const second = (await (
        await postJson(app, '/api/programs', { name: 'Programa 2', goal: 'strength' })
      ).json()) as { id: string; isActive: boolean }
      const firstAfter = (await getJson(app, `/api/programs/${first.id}`)) as { isActive: boolean }
      const list = (await getJson(app, '/api/programs')) as {
        programs: { name: string; isActive: boolean }[]
      }

      expect({
        secondActive: second.isActive,
        firstActive: firstAfter.isActive,
        listed: list.programs.map(({ name, isActive }) => ({ name, isActive })),
      }).toEqual({
        secondActive: true,
        firstActive: false,
        listed: [
          { name: 'Programa 2', isActive: true },
          { name: 'Programa 1', isActive: false },
        ],
      })
    })
  })
})

describe('Given two programs created one minute apart and an active one created before them', () => {
  describe('When GET /api/programs is requested', () => {
    it('Then should list the active program first and the other two from newest to oldest', async () => {
      const { app, clock } = createProgramTestApp()
      await postJson(app, '/api/programs', { name: 'Programa 1', goal: 'hypertrophy' })
      clock.advance(60_000)
      await postJson(app, '/api/programs', { name: 'Programa 2', goal: 'hypertrophy' })
      clock.advance(-180_000)
      await postJson(app, '/api/programs', { name: 'Programa 3', goal: 'hypertrophy' })

      const list = (await getJson(app, '/api/programs')) as {
        programs: { name: string; isActive: boolean; createdAt: string }[]
      }

      expect(
        list.programs.map(({ name, isActive, createdAt }) => ({ name, isActive, createdAt })),
      ).toEqual([
        { name: 'Programa 3', isActive: true, createdAt: '2026-11-21T09:58:00.000Z' },
        { name: 'Programa 2', isActive: false, createdAt: '2026-11-21T10:01:00.000Z' },
        { name: 'Programa 1', isActive: false, createdAt: '2026-11-21T10:00:00.000Z' },
      ])
    })
  })
})

const NAME_REQUIRED = { code: 'program_name_required', message: 'informe o nome do programa' }
const GOAL_REQUIRED = { code: 'program_goal_required', message: 'informe o objetivo do programa' }
const GOAL_INVALID = { code: 'program_goal_invalid', message: 'objetivo inválido' }

describe('Given an active program', () => {
  describe.each([
    { input: 'no name', body: { goal: 'hypertrophy' }, error: NAME_REQUIRED },
    { input: 'an empty name', body: { name: '', goal: 'hypertrophy' }, error: NAME_REQUIRED },
    { input: 'a blank name', body: { name: '   ', goal: 'hypertrophy' }, error: NAME_REQUIRED },
    { input: 'no goal', body: { name: 'Programa 2' }, error: GOAL_REQUIRED },
    {
      input: 'a goal outside the list',
      body: { name: 'Programa 2', goal: 'weightlifting' },
      error: GOAL_INVALID,
    },
  ])('When POST /api/programs has $input', ({ body, error }) => {
    it(`Then should respond 400 with ${error.code} and keep only the previous program active`, async () => {
      const { app } = createProgramTestApp()
      await postJson(app, '/api/programs', { name: 'Programa 1', goal: 'hypertrophy' })

      const response = await postJson(app, '/api/programs', body)
      const list = (await getJson(app, '/api/programs')) as {
        programs: { name: string; isActive: boolean }[]
      }

      expect({
        status: response.status,
        body: await response.json(),
        listed: list.programs.map(({ name, isActive }) => ({ name, isActive })),
      }).toEqual({
        status: 400,
        body: error,
        listed: [{ name: 'Programa 1', isActive: true }],
      })
    })
  })
})

const MISSING_PROGRAM_ID = '0193a1b2-0000-7000-8000-0000000003ff'
const PROGRAM_NOT_FOUND = { code: 'program_not_found', message: 'programa não encontrado' }

describe('Given a signed-in app without programs to show', () => {
  describe('When GET /api/programs/{id} uses an id that is not stored', () => {
    it("Then should respond 404 with code program_not_found and message 'programa não encontrado'", async () => {
      const { app } = createProgramTestApp()

      const response = await app.request(`/api/programs/${MISSING_PROGRAM_ID}`)

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 404,
        body: PROGRAM_NOT_FOUND,
      })
    })
  })
})

type DayView = { letter: string; label: string | null }

async function createProgram(app: App): Promise<string> {
  const response = await postJson(app, '/api/programs', {
    name: 'Programa 1',
    goal: 'hypertrophy',
  })
  return ((await response.json()) as { id: string }).id
}

function postDay(app: App, programId: string, body: Record<string, unknown>) {
  return postJson(app, `/api/programs/${programId}/days`, body)
}

async function listDays(app: App, programId: string): Promise<DayView[]> {
  const program = (await getJson(app, `/api/programs/${programId}`)) as { days: DayView[] }
  return program.days.map(({ letter, label }) => ({ letter, label }))
}

describe('Given a program with goal hypertrophy', () => {
  describe("When the planner adds letter 'B' named 'Inferior', then 'A' named 'Superior' and 'C' named 'Pernas'", () => {
    it('Then should respond 201 with the program and list the days in the order they were added', async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgram(app)

      await postDay(app, programId, { letter: 'B', label: 'Inferior' })
      await postDay(app, programId, { letter: 'A', label: 'Superior' })
      const last = await postDay(app, programId, { letter: 'C', label: 'Pernas' })
      const lastBody = (await last.json()) as { days: (DayView & { exercises: unknown[] })[] }

      expect({
        status: last.status,
        returned: lastBody.days,
        fetched: await listDays(app, programId),
      }).toEqual({
        status: 201,
        returned: [
          { letter: 'B', label: 'Inferior', exercises: [] },
          { letter: 'A', label: 'Superior', exercises: [] },
          { letter: 'C', label: 'Pernas', exercises: [] },
        ],
        fetched: [
          { letter: 'B', label: 'Inferior' },
          { letter: 'A', label: 'Superior' },
          { letter: 'C', label: 'Pernas' },
        ],
      })
    })
  })
})

describe('Given a program without days', () => {
  describe.each([
    { input: 'a blank label', body: { letter: 'a', label: '   ' } },
    { input: 'a null label', body: { letter: 'a', label: null } },
    { input: 'no label', body: { letter: 'a' } },
  ])("When the planner adds letter 'a' with $input", ({ body }) => {
    it("Then the program should show day 'A' with label null", async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgram(app)

      await postDay(app, programId, body)

      expect(await listDays(app, programId)).toEqual([{ letter: 'A', label: null }])
    })
  })
})

const LETTER_REQUIRED = { code: 'program_day_letter_required', message: 'informe a letra' }
const LETTER_INVALID = { code: 'program_day_letter_invalid', message: 'a letra deve ser de A a Z' }

describe('Given a program without days to refuse letters', () => {
  describe.each([
    { input: 'no letter', body: { label: 'Superior' }, error: LETTER_REQUIRED },
    { input: 'an empty letter', body: { letter: '' }, error: LETTER_REQUIRED },
    { input: "letter 'AB'", body: { letter: 'AB' }, error: LETTER_INVALID },
    { input: "letter '1'", body: { letter: '1' }, error: LETTER_INVALID },
    { input: "letter '-'", body: { letter: '-' }, error: LETTER_INVALID },
    { input: "letter 'É'", body: { letter: 'É' }, error: LETTER_INVALID },
    { input: "letter 'ı', whose upper case is 'I'", body: { letter: 'ı' }, error: LETTER_INVALID },
  ])('When POST /days has $input', ({ body, error }) => {
    it(`Then should respond 400 with ${error.code} and the program should have no days`, async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgram(app)

      const response = await postDay(app, programId, body)

      expect({
        status: response.status,
        body: await response.json(),
        days: await listDays(app, programId),
      }).toEqual({ status: 400, body: error, days: [] })
    })
  })
})

describe("Given a program with letter 'A' already added", () => {
  describe("When the planner adds letter 'a'", () => {
    it('Then should respond 409 with code program_day_letter_duplicated and keep one day', async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgram(app)
      await postDay(app, programId, { letter: 'A', label: 'Superior' })

      const response = await postDay(app, programId, { letter: 'a', label: 'Outra' })

      expect({
        status: response.status,
        body: await response.json(),
        days: await listDays(app, programId),
      }).toEqual({
        status: 409,
        body: { code: 'program_day_letter_duplicated', message: 'letra já existe no programa' },
        days: [{ letter: 'A', label: 'Superior' }],
      })
    })
  })
})

describe('Given a signed-in app without programs to add days to', () => {
  describe('When POST /api/programs/{id}/days uses an id that is not stored', () => {
    it('Then should respond 404 with code program_not_found', async () => {
      const { app } = createProgramTestApp()

      const response = await postDay(app, MISSING_PROGRAM_ID, { letter: 'A' })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 404,
        body: PROGRAM_NOT_FOUND,
      })
    })
  })
})

type ProgramView = { days: { letter: string; exercises: Record<string, unknown>[] }[] }

const SUPINO_RETO_INPUT = {
  exerciseSlug: 'supino-reto',
  sets: 3,
  targetReps: 10,
  loadG: 40000,
  restSeconds: 90,
}

const PRANCHA_INPUT = {
  exerciseSlug: 'prancha',
  sets: 3,
  targetSeconds: 45,
  loadG: 0,
  restSeconds: 60,
}

const SUPINO_RETO_PLANNED = {
  exercise: { id: expect.any(String), slug: 'supino-reto', name: 'Supino reto', kind: 'reps' },
  sets: 3,
  targetReps: 10,
  targetSeconds: null,
  loadG: 40000,
  restSeconds: 90,
}

const PRANCHA_PLANNED = {
  exercise: { id: expect.any(String), slug: 'prancha', name: 'Prancha', kind: 'time' },
  sets: 3,
  targetReps: null,
  targetSeconds: 45,
  loadG: 0,
  restSeconds: 60,
}

async function createProgramWithDays(app: App, letters: readonly string[]): Promise<string> {
  const programId = await createProgram(app)
  for (const letter of letters) {
    await postDay(app, programId, { letter })
  }
  return programId
}

function postPlannedExercise(
  app: App,
  programId: string,
  letter: string,
  body: Record<string, unknown>,
) {
  return postJson(app, `/api/programs/${programId}/days/${letter}/exercises`, body)
}

async function listDayExercises(app: App, programId: string, letter: string) {
  const program = (await getJson(app, `/api/programs/${programId}`)) as ProgramView
  return program.days.find((day) => day.letter === letter)?.exercises
}

describe("Given a program with goal hypertrophy and letter 'A'", () => {
  describe('When the planner adds supino-reto with 3 sets of 10 reps, loadG 40000 and restSeconds 90', () => {
    it("Then should respond 201 and letter 'A' should show it with those values and targetSeconds null", async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgramWithDays(app, ['A'])

      const response = await postPlannedExercise(app, programId, 'A', SUPINO_RETO_INPUT)
      const returned = (await response.json()) as ProgramView

      expect({
        status: response.status,
        returned: returned.days[0]?.exercises,
        fetched: await listDayExercises(app, programId, 'A'),
      }).toEqual({
        status: 201,
        returned: [SUPINO_RETO_PLANNED],
        fetched: [SUPINO_RETO_PLANNED],
      })
    })
  })
})

describe("Given a program with letter 'A' for a time exercise", () => {
  describe('When the planner adds prancha with 3 sets of 45 seconds, loadG 0 and restSeconds 60', () => {
    it("Then letter 'A' should show it with targetSeconds 45 and targetReps null", async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgramWithDays(app, ['A'])

      const response = await postPlannedExercise(app, programId, 'A', PRANCHA_INPUT)

      expect({
        status: response.status,
        fetched: await listDayExercises(app, programId, 'A'),
      }).toEqual({ status: 201, fetched: [PRANCHA_PLANNED] })
    })
  })
})

const TARGET_TIME = {
  code: 'planned_exercise_target_time',
  message: 'este exercício é medido por tempo',
}
const TARGET_REPS = {
  code: 'planned_exercise_target_reps',
  message: 'este exercício é medido por repetições',
}

describe("Given letter 'A', 'Prancha' of kind time and 'Supino reto' of kind reps", () => {
  describe.each([
    {
      input: 'targetReps for prancha',
      body: { ...PRANCHA_INPUT, targetSeconds: undefined, targetReps: 10 },
      error: TARGET_TIME,
    },
    {
      input: 'targetReps and targetSeconds for prancha',
      body: { ...PRANCHA_INPUT, targetReps: 10 },
      error: TARGET_TIME,
    },
    {
      input: 'targetSeconds for supino-reto',
      body: { ...SUPINO_RETO_INPUT, targetReps: undefined, targetSeconds: 45 },
      error: TARGET_REPS,
    },
    {
      input: 'targetSeconds and targetReps for supino-reto',
      body: { ...SUPINO_RETO_INPUT, targetSeconds: 45 },
      error: TARGET_REPS,
    },
  ])('When the planner gives $input', ({ body, error }) => {
    it(`Then should respond 400 with code ${error.code} and letter 'A' should still have no exercises`, async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgramWithDays(app, ['A'])

      const response = await postPlannedExercise(app, programId, 'A', body)

      expect({
        status: response.status,
        body: await response.json(),
        fetched: await listDayExercises(app, programId, 'A'),
      }).toEqual({ status: 400, body: error, fetched: [] })
    })
  })
})

const EXERCISE_REQUIRED = {
  code: 'planned_exercise_exercise_required',
  message: 'informe o exercício',
}
const SETS_INVALID = {
  code: 'planned_exercise_sets_invalid',
  message: 'informe as séries, a partir de 1',
}
const TARGET_REQUIRED = {
  code: 'planned_exercise_target_required',
  message: 'informe o alvo da série',
}
const TARGET_INVALID = { code: 'planned_exercise_target_invalid', message: 'alvo inválido' }
const LOAD_REQUIRED = { code: 'planned_exercise_load_required', message: 'informe a carga' }
const LOAD_INVALID = { code: 'planned_exercise_load_invalid', message: 'carga inválida' }
const REST_REQUIRED = { code: 'planned_exercise_rest_required', message: 'informe o descanso' }
const REST_INVALID = { code: 'planned_exercise_rest_invalid', message: 'descanso inválido' }
const UNSAFE_INTEGER = Number.MAX_SAFE_INTEGER + 1

describe("Given a program with letter 'A' and invalid planned exercise input", () => {
  describe.each([
    {
      input: 'no exerciseSlug',
      body: { ...SUPINO_RETO_INPUT, exerciseSlug: undefined },
      error: EXERCISE_REQUIRED,
    },
    {
      input: 'an empty exerciseSlug',
      body: { ...SUPINO_RETO_INPUT, exerciseSlug: '' },
      error: EXERCISE_REQUIRED,
    },
    { input: 'no sets', body: { ...SUPINO_RETO_INPUT, sets: undefined }, error: SETS_INVALID },
    { input: 'sets 0', body: { ...SUPINO_RETO_INPUT, sets: 0 }, error: SETS_INVALID },
    { input: 'sets -1', body: { ...SUPINO_RETO_INPUT, sets: -1 }, error: SETS_INVALID },
    { input: 'sets 1.5', body: { ...SUPINO_RETO_INPUT, sets: 1.5 }, error: SETS_INVALID },
    {
      input: 'sets above the safe integer',
      body: { ...SUPINO_RETO_INPUT, sets: UNSAFE_INTEGER },
      error: SETS_INVALID,
    },
    { input: 'no loadG', body: { ...SUPINO_RETO_INPUT, loadG: undefined }, error: LOAD_REQUIRED },
    { input: 'loadG -1', body: { ...SUPINO_RETO_INPUT, loadG: -1 }, error: LOAD_INVALID },
    { input: 'loadG 0.5', body: { ...SUPINO_RETO_INPUT, loadG: 0.5 }, error: LOAD_INVALID },
    {
      input: 'loadG above the safe integer',
      body: { ...SUPINO_RETO_INPUT, loadG: UNSAFE_INTEGER },
      error: LOAD_INVALID,
    },
    {
      input: 'no restSeconds',
      body: { ...SUPINO_RETO_INPUT, restSeconds: undefined },
      error: REST_REQUIRED,
    },
    {
      input: 'restSeconds -1',
      body: { ...SUPINO_RETO_INPUT, restSeconds: -1 },
      error: REST_INVALID,
    },
    {
      input: 'restSeconds 0.5',
      body: { ...SUPINO_RETO_INPUT, restSeconds: 0.5 },
      error: REST_INVALID,
    },
    {
      input: 'restSeconds above the safe integer',
      body: { ...SUPINO_RETO_INPUT, restSeconds: UNSAFE_INTEGER },
      error: REST_INVALID,
    },
    {
      input: 'no targetReps for supino-reto',
      body: { ...SUPINO_RETO_INPUT, targetReps: undefined },
      error: TARGET_REQUIRED,
    },
    {
      input: 'a null targetReps for supino-reto',
      body: { ...SUPINO_RETO_INPUT, targetReps: null },
      error: TARGET_REQUIRED,
    },
    {
      input: 'no targetSeconds for prancha',
      body: { ...PRANCHA_INPUT, targetSeconds: undefined },
      error: TARGET_REQUIRED,
    },
    { input: 'targetReps 0', body: { ...SUPINO_RETO_INPUT, targetReps: 0 }, error: TARGET_INVALID },
    {
      input: 'targetReps -1',
      body: { ...SUPINO_RETO_INPUT, targetReps: -1 },
      error: TARGET_INVALID,
    },
    {
      input: 'targetReps 1.5',
      body: { ...SUPINO_RETO_INPUT, targetReps: 1.5 },
      error: TARGET_INVALID,
    },
    {
      input: 'targetReps above the safe integer',
      body: { ...SUPINO_RETO_INPUT, targetReps: UNSAFE_INTEGER },
      error: TARGET_INVALID,
    },
    {
      input: 'targetSeconds 0 for prancha',
      body: { ...PRANCHA_INPUT, targetSeconds: 0 },
      error: TARGET_INVALID,
    },
    {
      input: 'targetSeconds 1.5 for prancha',
      body: { ...PRANCHA_INPUT, targetSeconds: 1.5 },
      error: TARGET_INVALID,
    },
    {
      input: 'sets 0 and no loadG, so sets is checked first',
      body: { ...SUPINO_RETO_INPUT, sets: 0, loadG: undefined },
      error: SETS_INVALID,
    },
  ])('When POST /exercises has $input', ({ body, error }) => {
    it(`Then should respond 400 with ${error.code} and letter 'A' should have no exercises`, async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgramWithDays(app, ['A'])

      const response = await postPlannedExercise(app, programId, 'A', body)

      expect({
        status: response.status,
        body: await response.json(),
        fetched: await listDayExercises(app, programId, 'A'),
      }).toEqual({ status: 400, body: error, fetched: [] })
    })
  })

  describe('When POST /exercises has restSeconds 0', () => {
    it('Then should respond 201 and store restSeconds 0', async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgramWithDays(app, ['A'])

      const response = await postPlannedExercise(app, programId, 'A', {
        ...SUPINO_RETO_INPUT,
        restSeconds: 0,
      })

      expect({
        status: response.status,
        fetched: await listDayExercises(app, programId, 'A'),
      }).toEqual({ status: 201, fetched: [{ ...SUPINO_RETO_PLANNED, restSeconds: 0 }] })
    })
  })

  describe("When POST uses letter '1' in the path", () => {
    it('Then should respond 400 with code program_day_letter_invalid', async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgramWithDays(app, ['A'])

      const response = await postPlannedExercise(app, programId, '1', SUPINO_RETO_INPUT)

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 400,
        body: LETTER_INVALID,
      })
    })
  })

  describe("When POST uses letter 'a' in the path", () => {
    it("Then should add the exercise to letter 'A'", async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgramWithDays(app, ['A'])

      const response = await postPlannedExercise(app, programId, 'a', SUPINO_RETO_INPUT)

      expect({
        status: response.status,
        fetched: await listDayExercises(app, programId, 'A'),
      }).toEqual({ status: 201, fetched: [SUPINO_RETO_PLANNED] })
    })
  })
})

describe('Given a signed-in app without programs and an invalid letter', () => {
  describe('When POST /exercises uses an invalid letter and an id that is not stored', () => {
    it('Then should respond 400 with program_day_letter_invalid, since input is checked before the database', async () => {
      const { app } = createProgramTestApp()

      const response = await postPlannedExercise(app, MISSING_PROGRAM_ID, '1', SUPINO_RETO_INPUT)

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 400,
        body: LETTER_INVALID,
      })
    })
  })
})

const DAY_NOT_FOUND = {
  code: 'program_day_not_found',
  message: 'letra não encontrada no programa',
}
const EXERCISE_NOT_FOUND = { code: 'exercise_not_found', message: 'exercício não encontrado' }

describe('Given a signed-in app without programs to add exercises to', () => {
  describe('When POST /exercises uses a program id that is not stored', () => {
    it('Then should respond 404 with code program_not_found', async () => {
      const { app } = createProgramTestApp()

      const response = await postPlannedExercise(app, MISSING_PROGRAM_ID, 'A', SUPINO_RETO_INPUT)

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 404,
        body: PROGRAM_NOT_FOUND,
      })
    })
  })
})

describe("Given a program with letter 'A' only", () => {
  describe("When the planner adds an exercise to letter 'B'", () => {
    it('Then should respond 404 with code program_day_not_found and store nothing', async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgramWithDays(app, ['A'])

      const response = await postPlannedExercise(app, programId, 'B', SUPINO_RETO_INPUT)

      expect({
        status: response.status,
        body: await response.json(),
        days: await listDays(app, programId),
      }).toEqual({ status: 404, body: DAY_NOT_FOUND, days: [{ letter: 'A', label: null }] })
    })
  })

  describe('When the planner adds a slug that is not in the catalog', () => {
    it('Then should respond 422 with code exercise_not_found', async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgramWithDays(app, ['A'])

      const response = await postPlannedExercise(app, programId, 'A', {
        ...SUPINO_RETO_INPUT,
        exerciseSlug: 'agachamento',
      })

      expect({
        status: response.status,
        body: await response.json(),
        fetched: await listDayExercises(app, programId, 'A'),
      }).toEqual({ status: 422, body: EXERCISE_NOT_FOUND, fetched: [] })
    })
  })

  describe('When the planner adds a slug that is not in the catalog and gives no target', () => {
    it('Then should respond 422 with exercise_not_found, since the target is checked after the exercise', async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgramWithDays(app, ['A'])

      const response = await postPlannedExercise(app, programId, 'A', {
        ...SUPINO_RETO_INPUT,
        exerciseSlug: 'agachamento',
        targetReps: undefined,
      })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 422,
        body: EXERCISE_NOT_FOUND,
      })
    })
  })
})

describe('Given an exercise with archived_at set directly in the database', () => {
  describe("When the planner adds it to letter 'A'", () => {
    it('Then should respond 422 with code exercise_not_found', async () => {
      const { app, db } = createProgramTestApp()
      const programId = await createProgramWithDays(app, ['A'])
      db.$client
        .prepare("UPDATE exercises SET archived_at = '2026-11-20T10:00:00.000Z' WHERE slug = ?")
        .run('supino-reto')

      const response = await postPlannedExercise(app, programId, 'A', SUPINO_RETO_INPUT)

      expect({
        status: response.status,
        body: await response.json(),
        fetched: await listDayExercises(app, programId, 'A'),
      }).toEqual({ status: 422, body: EXERCISE_NOT_FOUND, fetched: [] })
    })
  })
})

describe("Given letters 'A' and 'B' and supino-reto in 'A'", () => {
  describe("When supino-reto is added again to 'A' and then to 'B'", () => {
    it("Then should respond 409 with planned_exercise_duplicated, then 201, and 'A' should keep one supino-reto", async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgramWithDays(app, ['A', 'B'])
      await postPlannedExercise(app, programId, 'A', SUPINO_RETO_INPUT)

      const again = await postPlannedExercise(app, programId, 'A', SUPINO_RETO_INPUT)
      const otherDay = await postPlannedExercise(app, programId, 'B', SUPINO_RETO_INPUT)

      expect({
        again: { status: again.status, body: await again.json() },
        otherDayStatus: otherDay.status,
        dayA: await listDayExercises(app, programId, 'A'),
      }).toEqual({
        again: {
          status: 409,
          body: { code: 'planned_exercise_duplicated', message: 'exercício já está na letra' },
        },
        otherDayStatus: 201,
        dayA: [SUPINO_RETO_PLANNED],
      })
    })

    it("Then prancha added afterwards should come after supino-reto in 'A'", async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgramWithDays(app, ['A', 'B'])
      await postPlannedExercise(app, programId, 'A', SUPINO_RETO_INPUT)
      await postPlannedExercise(app, programId, 'A', SUPINO_RETO_INPUT)

      await postPlannedExercise(app, programId, 'A', PRANCHA_INPUT)

      expect(await listDayExercises(app, programId, 'A')).toEqual([
        SUPINO_RETO_PLANNED,
        PRANCHA_PLANNED,
      ])
    })
  })
})
