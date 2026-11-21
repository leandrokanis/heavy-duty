import { describe, expect, it } from 'vitest'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'
import { readWorkout, recordWorkout } from '../../test/workouts.js'
import { addExercise } from '../catalog/exercise.service.js'
import { addMuscle } from '../catalog/muscle.service.js'
import type { PlannedExercise, Program } from './programs.schemas.js'

type App = ProgramTestApp['app']

const STARTED_AT = '2026-11-20T18:30:00.000Z'

function sendJson(app: App, method: string, path: string, body?: Record<string, unknown>) {
  return app.request(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function getJson<T>(app: App, path: string): Promise<T> {
  const response = await app.request(path)
  return (await response.json()) as T
}

function plannedIn(
  program: Partial<Program>,
  letter: string,
  slug: string,
): PlannedExercise | undefined {
  return program.days
    ?.find((day) => day.letter === letter)
    ?.exercises.find((planned) => planned.exercise.slug === slug)
}

// Letter 'A' has supino-reto 3 x 10 at 40000 g with 90 s rest and prancha 3 x 45 s;
// letter 'B' has supino-reto too, as the neighbour an edit of 'A' must not touch.
async function givenActiveProgram(testApp: ProgramTestApp = createProgramTestApp()) {
  const { app } = testApp
  const created = await sendJson(app, 'POST', '/api/programs', {
    name: 'Programa 1',
    goal: 'hypertrophy',
  })
  const { id } = (await created.json()) as Program
  await sendJson(app, 'POST', `/api/programs/${id}/days`, { letter: 'A', label: 'Superior' })
  await sendJson(app, 'POST', `/api/programs/${id}/days`, { letter: 'B', label: 'Inferior' })
  await sendJson(app, 'POST', `/api/programs/${id}/days/A/exercises`, {
    exerciseSlug: 'supino-reto',
    sets: 3,
    targetReps: 10,
    loadG: 40000,
    restSeconds: 90,
  })
  await sendJson(app, 'POST', `/api/programs/${id}/days/A/exercises`, {
    exerciseSlug: 'prancha',
    sets: 3,
    targetSeconds: 45,
    loadG: 0,
    restSeconds: 60,
  })
  await sendJson(app, 'POST', `/api/programs/${id}/days/B/exercises`, {
    exerciseSlug: 'supino-reto',
    sets: 3,
    targetReps: 10,
    loadG: 40000,
    restSeconds: 90,
  })
  return { ...testApp, programId: id }
}

describe("Given an active program with supino-reto at loadG 40000 in letter 'A' and a recorded workout with supino-reto at 40000", () => {
  describe('When PATCH …/days/A/exercises/supino-reto sets loadG 42500', () => {
    it('Then GET /api/programs should show the active program with loadG 42500 and the recorded workout should still have 40000', async () => {
      const { app, db, clock, programId } = await givenActiveProgram()
      const workoutId = recordWorkout(
        db,
        {
          programId,
          letter: 'A',
          startedAt: STARTED_AT,
          sets: [{ exerciseSlug: 'supino-reto', loadG: 40000, reps: 10 }],
        },
        clock.now(),
      )

      const response = await sendJson(
        app,
        'PATCH',
        `/api/programs/${programId}/days/A/exercises/supino-reto`,
        { loadG: 42500 },
      )
      const body = (await response.json()) as Program
      const list = await getJson<{ programs: Program[] }>(app, '/api/programs')
      const active = list.programs.find((program) => program.isActive) as Program

      expect({
        status: response.status,
        returnedLoadG: plannedIn(body, 'A', 'supino-reto')?.loadG,
        activeId: active.id,
        activeLoadG: plannedIn(active, 'A', 'supino-reto')?.loadG,
        neighbourLoadG: plannedIn(active, 'B', 'supino-reto')?.loadG,
        workoutSets: readWorkout(db, workoutId)?.sets.map(({ loadG }) => loadG),
      }).toEqual({
        status: 200,
        returnedLoadG: 42500,
        activeId: programId,
        activeLoadG: 42500,
        neighbourLoadG: 40000,
        workoutSets: [40000],
      })
    })
  })
})

describe("Given letter 'A' with supino-reto 3 x 10, loadG 40000 and restSeconds 90", () => {
  describe('When PATCH sets 4, targetReps 8 and restSeconds 120', () => {
    it("Then letter 'A' should show supino-reto 4 x 8, loadG 40000 and restSeconds 120", async () => {
      const { app, programId } = await givenActiveProgram()

      const response = await sendJson(
        app,
        'PATCH',
        `/api/programs/${programId}/days/A/exercises/supino-reto`,
        { sets: 4, targetReps: 8, restSeconds: 120 },
      )
      const fetched = await getJson<Program>(app, `/api/programs/${programId}`)

      expect({ status: response.status, planned: plannedIn(fetched, 'A', 'supino-reto') }).toEqual({
        status: 200,
        planned: {
          exercise: expect.objectContaining({ slug: 'supino-reto' }),
          sets: 4,
          targetReps: 8,
          targetSeconds: null,
          loadG: 40000,
          restSeconds: 120,
        },
      })
    })
  })

  describe('When PATCH has an empty body', () => {
    it('Then should respond 200 with the program unchanged', async () => {
      const { app, programId } = await givenActiveProgram()
      const before = await getJson<Program>(app, `/api/programs/${programId}`)

      const response = await sendJson(
        app,
        'PATCH',
        `/api/programs/${programId}/days/A/exercises/supino-reto`,
        {},
      )
      const body = await response.json()
      const after = await getJson<Program>(app, `/api/programs/${programId}`)

      expect({ status: response.status, body, after }).toEqual({
        status: 200,
        body: before,
        after: before,
      })
    })
  })

  describe("When PATCH has an empty body for an exercise not in letter 'B'", () => {
    it('Then should respond 404 with planned_exercise_not_found', async () => {
      const { app, programId } = await givenActiveProgram()

      const response = await sendJson(
        app,
        'PATCH',
        `/api/programs/${programId}/days/B/exercises/prancha`,
        {},
      )

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 404,
        body: { code: 'planned_exercise_not_found', message: 'exercício não está na letra' },
      })
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

describe("Given letter 'A' with prancha 3 x 45 s and supino-reto 3 x 10", () => {
  describe.each([
    { slug: 'prancha', input: 'targetReps 10', body: { targetReps: 10 }, error: TARGET_TIME },
    {
      slug: 'prancha',
      input: 'targetReps 10 with targetSeconds 30',
      body: { targetReps: 10, targetSeconds: 30 },
      error: TARGET_TIME,
    },
    {
      slug: 'supino-reto',
      input: 'targetSeconds 30',
      body: { targetSeconds: 30 },
      error: TARGET_REPS,
    },
    {
      slug: 'supino-reto',
      input: 'targetSeconds 30 with targetReps 8',
      body: { targetSeconds: 30, targetReps: 8 },
      error: TARGET_REPS,
    },
  ])('When PATCH …/exercises/$slug gives $input', ({ slug, body, error }) => {
    it(`Then should respond 400 with ${error.code} and keep the planned exercise`, async () => {
      const { app, programId } = await givenActiveProgram()
      const before = await getJson<Program>(app, `/api/programs/${programId}`)

      const response = await sendJson(
        app,
        'PATCH',
        `/api/programs/${programId}/days/A/exercises/${slug}`,
        body,
      )
      const after = await getJson<Program>(app, `/api/programs/${programId}`)

      expect({ status: response.status, body: await response.json(), after }).toEqual({
        status: 400,
        body: error,
        after: before,
      })
    })
  })

  describe('When PATCH …/exercises/prancha gives targetReps null with targetSeconds 50', () => {
    it('Then should respond 200 with prancha 3 x 50 s', async () => {
      const { app, programId } = await givenActiveProgram()

      const response = await sendJson(
        app,
        'PATCH',
        `/api/programs/${programId}/days/A/exercises/prancha`,
        { targetReps: null, targetSeconds: 50 },
      )
      const body = (await response.json()) as Program
      const planned = plannedIn(body, 'A', 'prancha')

      expect({
        status: response.status,
        sets: planned?.sets,
        targetReps: planned?.targetReps,
        targetSeconds: planned?.targetSeconds,
      }).toEqual({ status: 200, sets: 3, targetReps: null, targetSeconds: 50 })
    })
  })
})

const SETS_INVALID = {
  code: 'planned_exercise_sets_invalid',
  message: 'informe as séries, a partir de 1',
}
const LOAD_INVALID = { code: 'planned_exercise_load_invalid', message: 'carga inválida' }
const REST_INVALID = { code: 'planned_exercise_rest_invalid', message: 'descanso inválido' }
const TARGET_INVALID = { code: 'planned_exercise_target_invalid', message: 'alvo inválido' }
const UNSAFE_INTEGER = 9007199254740992

describe("Given supino-reto in letter 'A' planned 3 x 10 at loadG 40000 with restSeconds 90", () => {
  it.each([
    { input: 'sets 0', body: { sets: 0 }, error: SETS_INVALID },
    { input: 'sets -1', body: { sets: -1 }, error: SETS_INVALID },
    { input: 'sets 1.5', body: { sets: 1.5 }, error: SETS_INVALID },
    { input: 'sets above the safe integer', body: { sets: UNSAFE_INTEGER }, error: SETS_INVALID },
    { input: 'sets null', body: { sets: null }, error: SETS_INVALID },
    { input: 'loadG -1', body: { loadG: -1 }, error: LOAD_INVALID },
    { input: 'loadG 0.5', body: { loadG: 0.5 }, error: LOAD_INVALID },
    { input: 'loadG above the safe integer', body: { loadG: UNSAFE_INTEGER }, error: LOAD_INVALID },
    { input: 'loadG null', body: { loadG: null }, error: LOAD_INVALID },
    { input: 'restSeconds -1', body: { restSeconds: -1 }, error: REST_INVALID },
    { input: 'restSeconds 0.5', body: { restSeconds: 0.5 }, error: REST_INVALID },
    {
      input: 'restSeconds above the safe integer',
      body: { restSeconds: UNSAFE_INTEGER },
      error: REST_INVALID,
    },
    { input: 'restSeconds null', body: { restSeconds: null }, error: REST_INVALID },
    { input: 'targetReps 0', body: { targetReps: 0 }, error: TARGET_INVALID },
    { input: 'targetReps -1', body: { targetReps: -1 }, error: TARGET_INVALID },
    { input: 'targetReps 1.5', body: { targetReps: 1.5 }, error: TARGET_INVALID },
    {
      input: 'targetReps above the safe integer',
      body: { targetReps: UNSAFE_INTEGER },
      error: TARGET_INVALID,
    },
    { input: 'targetReps null', body: { targetReps: null }, error: TARGET_INVALID },
    {
      input: 'a valid loadG with sets 0',
      body: { loadG: 42500, sets: 0 },
      error: SETS_INVALID,
    },
  ])(
    'When PATCH …/exercises/supino-reto has $input / Then should respond 400 with $error.code and keep supino-reto',
    async ({ body, error }) => {
      const { app, programId } = await givenActiveProgram()
      const before = await getJson<Program>(app, `/api/programs/${programId}`)

      const response = await sendJson(
        app,
        'PATCH',
        `/api/programs/${programId}/days/A/exercises/supino-reto`,
        body,
      )
      const after = await getJson<Program>(app, `/api/programs/${programId}`)

      expect({ status: response.status, body: await response.json(), after }).toEqual({
        status: 400,
        body: error,
        after: before,
      })
    },
  )

  describe('When PATCH sets loadG 0 and restSeconds 0', () => {
    it('Then should respond 200 with supino-reto at loadG 0 and restSeconds 0', async () => {
      const { app, programId } = await givenActiveProgram()

      const response = await sendJson(
        app,
        'PATCH',
        `/api/programs/${programId}/days/A/exercises/supino-reto`,
        { loadG: 0, restSeconds: 0 },
      )
      const planned = plannedIn((await response.json()) as Program, 'A', 'supino-reto')

      expect({
        status: response.status,
        loadG: planned?.loadG,
        restSeconds: planned?.restSeconds,
      }).toEqual({ status: 200, loadG: 0, restSeconds: 0 })
    })
  })
})

describe('Given an active program whose letters have no prancha in B and no letter C', () => {
  it.each([
    {
      input: 'sets 0 for an exercise not in letter B',
      path: 'days/B/exercises/prancha',
      body: { sets: 0 },
      status: 400,
      error: SETS_INVALID,
    },
    {
      input: 'targetReps on prancha in the absent letter C',
      path: 'days/C/exercises/prancha',
      body: { targetReps: 10 },
      status: 404,
      error: { code: 'program_day_not_found', message: 'letra não encontrada no programa' },
    },
  ])(
    'When PATCH has $input / Then should respond $status with $error.code',
    async ({ path, body, status, error }) => {
      const { app, programId } = await givenActiveProgram()

      const response = await sendJson(app, 'PATCH', `/api/programs/${programId}/${path}`, body)

      expect({ status: response.status, body: await response.json() }).toEqual({
        status,
        body: error,
      })
    },
  )
})

const ABSENT_PROGRAM_ID = '0193a1b2-0000-7000-8000-000000000999'
const PLANNED_NOT_FOUND = {
  code: 'planned_exercise_not_found',
  message: 'exercício não está na letra',
}

describe("Given an active program with supino-reto in letters 'A' and 'B' and prancha only in 'A'", () => {
  it.each([
    {
      input: 'an absent program',
      path: (_id: string) => `/api/programs/${ABSENT_PROGRAM_ID}/days/A/exercises/supino-reto`,
      status: 404,
      error: { code: 'program_not_found', message: 'programa não encontrado' },
    },
    {
      input: 'an absent letter',
      path: (id: string) => `/api/programs/${id}/days/Z/exercises/supino-reto`,
      status: 404,
      error: { code: 'program_day_not_found', message: 'letra não encontrada no programa' },
    },
    {
      input: 'a letter outside A to Z',
      path: (id: string) => `/api/programs/${id}/days/1/exercises/supino-reto`,
      status: 400,
      error: { code: 'program_day_letter_invalid', message: 'a letra deve ser de A a Z' },
    },
    {
      input: "an exercise not in letter 'B'",
      path: (id: string) => `/api/programs/${id}/days/B/exercises/prancha`,
      status: 404,
      error: PLANNED_NOT_FOUND,
    },
    {
      input: 'a slug outside the catalog',
      path: (id: string) => `/api/programs/${id}/days/A/exercises/remada-curvada`,
      status: 404,
      error: PLANNED_NOT_FOUND,
    },
  ])(
    'When PATCH sets loadG 42500 on $input / Then should respond $status with $error.code',
    async ({ path, status, error }) => {
      const { app, programId } = await givenActiveProgram()

      const response = await sendJson(app, 'PATCH', path(programId), { loadG: 42500 })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status,
        body: error,
      })
    },
  )

  describe("When PATCH …/days/a/exercises/supino-reto sets loadG 42500 after supino-reto's archived_at is set directly in the database", () => {
    it("Then should respond 200 with supino-reto of letter 'A' at loadG 42500", async () => {
      const { app, db, programId } = await givenActiveProgram()
      db.$client
        .prepare("UPDATE exercises SET archived_at = ? WHERE slug = 'supino-reto'")
        .run('2026-11-21T11:00:00.000Z')

      const response = await sendJson(
        app,
        'PATCH',
        `/api/programs/${programId}/days/a/exercises/supino-reto`,
        { loadG: 42500 },
      )
      const body = (await response.json()) as Program

      expect({
        status: response.status,
        loadG: plannedIn(body, 'A', 'supino-reto')?.loadG,
      }).toEqual({ status: 200, loadG: 42500 })
    })
  })
})

function slugsOf(program: Partial<Program>, letter: string): string[] | undefined {
  return program.days
    ?.find((day) => day.letter === letter)
    ?.exercises.map((planned) => planned.exercise.slug)
}

describe("Given letter 'A' with supino-reto and prancha and a recorded workout with supino-reto at 40000", () => {
  describe('When DELETE …/days/A/exercises/supino-reto', () => {
    it("Then letter 'A' should show only prancha and the workout should still have supino-reto at 40000 with plannedExerciseId null", async () => {
      const { app, db, clock, programId } = await givenActiveProgram()
      const workoutId = recordWorkout(
        db,
        {
          programId,
          letter: 'A',
          startedAt: STARTED_AT,
          sets: [{ exerciseSlug: 'supino-reto', loadG: 40000, reps: 10 }],
        },
        clock.now(),
      )

      const response = await sendJson(
        app,
        'DELETE',
        `/api/programs/${programId}/days/A/exercises/supino-reto`,
      )
      const body = (await response.json()) as Program
      const fetched = await getJson<Program>(app, `/api/programs/${programId}`)

      expect({
        status: response.status,
        returned: slugsOf(body, 'A'),
        fetched: slugsOf(fetched, 'A'),
        workout: readWorkout(db, workoutId),
      }).toEqual({
        status: 200,
        returned: ['prancha'],
        fetched: ['prancha'],
        workout: {
          programId,
          programDayId: expect.any(String),
          letter: 'A',
          startedAt: STARTED_AT,
          sets: [
            {
              exerciseSlug: 'supino-reto',
              plannedExerciseId: null,
              loadG: 40000,
              reps: 10,
              seconds: null,
            },
          ],
        },
      })
    })
  })

  describe('When the same DELETE is sent twice', () => {
    it('Then the second should respond 404 with planned_exercise_not_found', async () => {
      const { app, programId } = await givenActiveProgram()
      const path = `/api/programs/${programId}/days/A/exercises/supino-reto`
      await sendJson(app, 'DELETE', path)

      const response = await sendJson(app, 'DELETE', path)

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 404,
        body: PLANNED_NOT_FOUND,
      })
    })
  })

  describe("When DELETE …/days/A/exercises/supino-reto after supino-reto's archived_at is set directly in the database", () => {
    it("Then should respond 200 with letter 'A' showing only prancha", async () => {
      const { app, db, programId } = await givenActiveProgram()
      db.$client
        .prepare("UPDATE exercises SET archived_at = ? WHERE slug = 'supino-reto'")
        .run('2026-11-21T11:00:00.000Z')

      const response = await sendJson(
        app,
        'DELETE',
        `/api/programs/${programId}/days/A/exercises/supino-reto`,
      )

      expect({
        status: response.status,
        slugs: slugsOf((await response.json()) as Program, 'A'),
      }).toEqual({ status: 200, slugs: ['prancha'] })
    })
  })
})

describe("Given letter 'A' with supino-reto, prancha and crucifixo, in that order", () => {
  describe('When prancha is removed and then added again', () => {
    it("Then letter 'A' should list supino-reto and crucifixo in the same order and prancha last", async () => {
      const { app, db, programId } = await givenActiveProgram()
      addExercise(db, { name: 'Crucifixo', kind: 'reps', primaryMuscleSlugs: ['peitoral-maior'] })
      await sendJson(app, 'POST', `/api/programs/${programId}/days/A/exercises`, {
        exerciseSlug: 'crucifixo',
        sets: 3,
        targetReps: 12,
        loadG: 14000,
        restSeconds: 60,
      })

      await sendJson(app, 'DELETE', `/api/programs/${programId}/days/A/exercises/prancha`)
      const added = await sendJson(app, 'POST', `/api/programs/${programId}/days/A/exercises`, {
        exerciseSlug: 'prancha',
        sets: 3,
        targetSeconds: 45,
        loadG: 0,
        restSeconds: 60,
      })
      const fetched = await getJson<Program>(app, `/api/programs/${programId}`)

      expect({
        added: slugsOf((await added.json()) as Program, 'A'),
        fetched: slugsOf(fetched, 'A'),
      }).toEqual({
        added: ['supino-reto', 'crucifixo', 'prancha'],
        fetched: ['supino-reto', 'crucifixo', 'prancha'],
      })
    })
  })
})

async function givenTwoPrograms() {
  const given = await givenActiveProgram()
  given.clock.advance(60_000)
  const created = await sendJson(given.app, 'POST', '/api/programs', {
    name: 'Programa 2',
    goal: 'endurance',
  })
  const other = (await created.json()) as Program
  return { ...given, otherId: other.id }
}

function nameAndGoal(program: Partial<Program>) {
  return { name: program.name, goal: program.goal }
}

describe("Given 'Programa 1' with goal hypertrophy and 'Programa 2' with goal endurance", () => {
  describe('When PATCH /api/programs/{id of Programa 1} sets goal strength', () => {
    it("Then GET should show 'Programa 1' with goal strength and 'Programa 2' unchanged", async () => {
      const { app, programId, otherId } = await givenTwoPrograms()

      const response = await sendJson(app, 'PATCH', `/api/programs/${programId}`, {
        goal: 'strength',
      })
      const body = (await response.json()) as Program
      const fetched = await getJson<Program>(app, `/api/programs/${programId}`)
      const other = await getJson<Program>(app, `/api/programs/${otherId}`)

      expect({
        status: response.status,
        returned: nameAndGoal(body),
        fetched: nameAndGoal(fetched),
        other: nameAndGoal(other),
      }).toEqual({
        status: 200,
        returned: { name: 'Programa 1', goal: 'strength' },
        fetched: { name: 'Programa 1', goal: 'strength' },
        other: { name: 'Programa 2', goal: 'endurance' },
      })
    })
  })

  describe("When PATCH /api/programs/{id of Programa 1} sets name '  Programa A  '", () => {
    it("Then GET should show 'Programa A' with goal hypertrophy", async () => {
      const { app, programId } = await givenTwoPrograms()

      const response = await sendJson(app, 'PATCH', `/api/programs/${programId}`, {
        name: '  Programa A  ',
      })
      const fetched = await getJson<Program>(app, `/api/programs/${programId}`)

      expect({ status: response.status, fetched: nameAndGoal(fetched) }).toEqual({
        status: 200,
        fetched: { name: 'Programa A', goal: 'hypertrophy' },
      })
    })
  })
})

const NAME_REQUIRED = { code: 'program_name_required', message: 'informe o nome do programa' }
const GOAL_REQUIRED = { code: 'program_goal_required', message: 'informe o objetivo do programa' }
const GOAL_INVALID = { code: 'program_goal_invalid', message: 'objetivo inválido' }

describe("Given 'Programa 1' with goal hypertrophy", () => {
  it.each([
    { input: 'name null', body: { name: null }, status: 400, error: NAME_REQUIRED },
    { input: 'an empty name', body: { name: '' }, status: 400, error: NAME_REQUIRED },
    { input: 'a blank name', body: { name: '   ' }, status: 400, error: NAME_REQUIRED },
    { input: 'goal null', body: { goal: null }, status: 400, error: GOAL_REQUIRED },
    { input: 'an empty goal', body: { goal: '' }, status: 400, error: GOAL_REQUIRED },
    { input: 'a goal outside the list', body: { goal: 'power' }, status: 400, error: GOAL_INVALID },
    {
      input: 'a blank name with a valid goal',
      body: { name: '   ', goal: 'strength' },
      status: 400,
      error: NAME_REQUIRED,
    },
  ])(
    'When PATCH /api/programs/{id} has $input / Then should respond $status with $error.code and keep name and goal',
    async ({ body, status, error }) => {
      const { app, programId } = await givenActiveProgram()

      const response = await sendJson(app, 'PATCH', `/api/programs/${programId}`, body)
      const fetched = await getJson<Program>(app, `/api/programs/${programId}`)

      expect({
        status: response.status,
        body: await response.json(),
        fetched: nameAndGoal(fetched),
      }).toEqual({ status, body: error, fetched: { name: 'Programa 1', goal: 'hypertrophy' } })
    },
  )

  describe('When PATCH /api/programs/{absent id} sets goal strength', () => {
    it('Then should respond 404 with program_not_found', async () => {
      const { app } = await givenActiveProgram()

      const response = await sendJson(app, 'PATCH', `/api/programs/${ABSENT_PROGRAM_ID}`, {
        goal: 'strength',
      })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 404,
        body: { code: 'program_not_found', message: 'programa não encontrado' },
      })
    })
  })
})

async function listedActivity(app: App) {
  const list = await getJson<{ programs: Program[] }>(app, '/api/programs')
  return list.programs.map(({ name, isActive }) => ({ name, isActive }))
}

describe("Given 'Programa 1' and 'Programa 2', with 'Programa 2' active", () => {
  describe('When POST /api/programs/{id of Programa 1}/activate', () => {
    it("Then 'Programa 1' should be active and listed first, and 'Programa 2' should stay stored, inactive", async () => {
      const { app, programId } = await givenTwoPrograms()

      const response = await sendJson(app, 'POST', `/api/programs/${programId}/activate`)
      const body = (await response.json()) as Program

      expect({
        status: response.status,
        returned: { name: body.name, isActive: body.isActive },
        listed: await listedActivity(app),
      }).toEqual({
        status: 200,
        returned: { name: 'Programa 1', isActive: true },
        listed: [
          { name: 'Programa 1', isActive: true },
          { name: 'Programa 2', isActive: false },
        ],
      })
    })
  })

  describe('When POST /api/programs/{id of Programa 2}/activate on the program already active', () => {
    it('Then should respond 200 and keep the list unchanged', async () => {
      const { app, otherId } = await givenTwoPrograms()
      const before = await getJson<unknown>(app, '/api/programs')

      const response = await sendJson(app, 'POST', `/api/programs/${otherId}/activate`)

      expect({
        status: response.status,
        after: await getJson<unknown>(app, '/api/programs'),
      }).toEqual({ status: 200, after: before })
    })
  })

  describe('When POST /api/programs/{absent id}/activate', () => {
    it("Then should respond 404 with program_not_found and 'Programa 2' should stay active", async () => {
      const { app } = await givenTwoPrograms()

      const response = await sendJson(app, 'POST', `/api/programs/${ABSENT_PROGRAM_ID}/activate`)

      expect({
        status: response.status,
        body: await response.json(),
        listed: await listedActivity(app),
      }).toEqual({
        status: 404,
        body: { code: 'program_not_found', message: 'programa não encontrado' },
        listed: [
          { name: 'Programa 2', isActive: true },
          { name: 'Programa 1', isActive: false },
        ],
      })
    })
  })
})

function labels(program: Partial<Program>) {
  return program.days?.map(({ letter, label }) => ({ letter, label }))
}

describe("Given letter 'A' named 'Superior' and letter 'B' named 'Inferior'", () => {
  it.each([
    { input: "label ' Empurrar '", body: { label: ' Empurrar ' }, label: 'Empurrar' },
    { input: 'label null', body: { label: null }, label: null },
    { input: 'an empty label', body: { label: '' }, label: null },
    { input: 'a blank label', body: { label: '   ' }, label: null },
    { input: 'an empty body', body: {}, label: 'Superior' },
  ])(
    "When PATCH …/days/a has $input / Then letter 'A' should be named $label and 'B' should keep 'Inferior'",
    async ({ body, label }) => {
      const { app, programId } = await givenActiveProgram()

      const response = await sendJson(app, 'PATCH', `/api/programs/${programId}/days/a`, body)
      const returned = (await response.json()) as Program
      const fetched = await getJson<Program>(app, `/api/programs/${programId}`)
      const expected = [
        { letter: 'A', label },
        { letter: 'B', label: 'Inferior' },
      ]

      expect({
        status: response.status,
        returned: labels(returned),
        fetched: labels(fetched),
      }).toEqual({ status: 200, returned: expected, fetched: expected })
    },
  )

  describe("When PATCH …/days/Z sets label 'Empurrar'", () => {
    it('Then should respond 404 with program_day_not_found', async () => {
      const { app, programId } = await givenActiveProgram()

      const response = await sendJson(app, 'PATCH', `/api/programs/${programId}/days/Z`, {
        label: 'Empurrar',
      })

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 404,
        body: { code: 'program_day_not_found', message: 'letra não encontrada no programa' },
      })
    })
  })
})

function letters(program: Partial<Program>): string[] | undefined {
  return program.days?.map((day) => day.letter)
}

// Adds letter 'C' with agachamento at 60000 g after the letters 'A' and 'B'.
async function givenLetterCWithAgachamento() {
  const given = await givenActiveProgram()
  addMuscle(given.db, { name: 'vasto lateral', muscleGroupSlug: 'quadriceps' })
  addExercise(given.db, {
    name: 'Agachamento',
    kind: 'reps',
    primaryMuscleSlugs: ['vasto-lateral'],
  })
  await sendJson(given.app, 'POST', `/api/programs/${given.programId}/days`, { letter: 'C' })
  await sendJson(given.app, 'POST', `/api/programs/${given.programId}/days/C/exercises`, {
    exerciseSlug: 'agachamento',
    sets: 4,
    targetReps: 8,
    loadG: 60000,
    restSeconds: 120,
  })
  return given
}

describe("Given letters 'A', 'B' and 'C' and a recorded workout of letter 'C' with agachamento at 60000", () => {
  describe('When DELETE …/days/C', () => {
    it("Then the program should show only 'A' and 'B', in that order, and the workout should still be of letter 'C' with agachamento at 60000", async () => {
      const { app, db, clock, programId } = await givenLetterCWithAgachamento()
      const workoutId = recordWorkout(
        db,
        {
          programId,
          letter: 'C',
          startedAt: STARTED_AT,
          sets: [{ exerciseSlug: 'agachamento', loadG: 60000, reps: 8 }],
        },
        clock.now(),
      )

      const response = await sendJson(app, 'DELETE', `/api/programs/${programId}/days/C`)
      const body = (await response.json()) as Program
      const fetched = await getJson<Program>(app, `/api/programs/${programId}`)

      expect({
        status: response.status,
        returned: letters(body),
        fetched: letters(fetched),
        workout: readWorkout(db, workoutId),
      }).toEqual({
        status: 200,
        returned: ['A', 'B'],
        fetched: ['A', 'B'],
        workout: {
          programId,
          programDayId: null,
          letter: 'C',
          startedAt: STARTED_AT,
          sets: [
            {
              exerciseSlug: 'agachamento',
              plannedExerciseId: null,
              loadG: 60000,
              reps: 8,
              seconds: null,
            },
          ],
        },
      })
    })
  })
})

describe("Given letters 'A', 'B' and 'C' with supino-reto in 'B'", () => {
  describe('When DELETE …/days/B removes the middle letter', () => {
    it("Then the days should be 'A' and 'C', in that order", async () => {
      const { app, programId } = await givenLetterCWithAgachamento()

      const response = await sendJson(app, 'DELETE', `/api/programs/${programId}/days/B`)

      expect({
        status: response.status,
        letters: letters((await response.json()) as Program),
      }).toEqual({ status: 200, letters: ['A', 'C'] })
    })
  })

  describe('When the same DELETE …/days/B is sent twice', () => {
    it('Then the second should respond 404 with program_day_not_found', async () => {
      const { app, programId } = await givenLetterCWithAgachamento()
      await sendJson(app, 'DELETE', `/api/programs/${programId}/days/B`)

      const response = await sendJson(app, 'DELETE', `/api/programs/${programId}/days/B`)

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 404,
        body: { code: 'program_day_not_found', message: 'letra não encontrada no programa' },
      })
    })
  })

  describe("When DELETE …/days/B and then POST /days adds 'B' again", () => {
    it("Then the days should be 'A', 'C', 'B' and the new 'B' should have no exercises", async () => {
      const { app, programId } = await givenLetterCWithAgachamento()
      await sendJson(app, 'DELETE', `/api/programs/${programId}/days/B`)

      const response = await sendJson(app, 'POST', `/api/programs/${programId}/days`, {
        letter: 'B',
      })
      const fetched = await getJson<Program>(app, `/api/programs/${programId}`)

      expect({
        status: response.status,
        letters: letters(fetched),
        newB: fetched.days.find((day) => day.letter === 'B'),
      }).toEqual({
        status: 201,
        letters: ['A', 'C', 'B'],
        newB: { letter: 'B', label: null, exercises: [] },
      })
    })
  })
})

describe("Given a program with only letter 'A'", () => {
  describe('When DELETE …/days/A', () => {
    it('Then the program should have no days', async () => {
      const { app } = createProgramTestApp()
      const created = await sendJson(app, 'POST', '/api/programs', {
        name: 'Programa 1',
        goal: 'strength',
      })
      const { id } = (await created.json()) as Program
      await sendJson(app, 'POST', `/api/programs/${id}/days`, { letter: 'A' })

      const response = await sendJson(app, 'DELETE', `/api/programs/${id}/days/A`)
      const fetched = await getJson<Program>(app, `/api/programs/${id}`)

      expect({ status: response.status, days: fetched.days }).toEqual({ status: 200, days: [] })
    })
  })
})
