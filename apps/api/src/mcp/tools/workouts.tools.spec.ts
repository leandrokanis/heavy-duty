import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import type { Database } from '../../db/connection.js'
import { exercises, plannedExercises, workoutSets, workoutSkips } from '../../db/schema.js'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'
import { recordWorkout } from '../../test/workouts.js'

type App = ProgramTestApp['app']

type JsonRpcResponse = {
  result?: {
    structuredContent?: unknown
    isError?: boolean
    content?: { type: string; text: string }[]
    tools?: {
      name: string
      description?: string
      annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean }
    }[]
  }
}

async function rpc(app: App, method: string, params: Record<string, unknown>) {
  const response = await app.request('/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  return (await response.json()) as JsonRpcResponse
}

function callTool(app: App, args: Record<string, unknown>, name = 'list_workouts') {
  return rpc(app, 'tools/call', { name, arguments: args })
}

async function sendJson(app: App, path: string, body: Record<string, unknown>) {
  const response = await app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return (await response.json()) as { id: string }
}

const FROM = '2026-11-09T03:00:00.000Z'
const TO = '2026-11-16T03:00:00.000Z'

// Letter 'A' with supino-reto, and two workouts of it inside the week.
async function givenTwoWorkoutsInTheWeek(): Promise<ProgramTestApp> {
  const testApp = createProgramTestApp()
  const { app, db, clock } = testApp
  const { id: programId } = await sendJson(app, '/api/programs', {
    name: 'Programa 1',
    goal: 'hypertrophy',
  })
  await sendJson(app, `/api/programs/${programId}/days`, { letter: 'A', label: 'Superior' })
  await sendJson(app, `/api/programs/${programId}/days/A/exercises`, {
    exerciseSlug: 'supino-reto',
    sets: 3,
    targetReps: 10,
    loadG: 40000,
    restSeconds: 90,
  })
  for (const startedAt of ['2026-11-10T18:00:00.000Z', '2026-11-12T18:00:00.000Z']) {
    clock.advance(1000)
    recordWorkout(
      db,
      {
        programId,
        letter: 'A',
        startedAt,
        sets: [{ exerciseSlug: 'supino-reto', loadG: 40000, reps: 10 }],
      },
      clock.now(),
    )
  }
  return testApp
}

describe('Given two workouts in the week', () => {
  describe('When list_workouts is called through /mcp with the interval of the week', () => {
    it('Then structuredContent should equal the body of GET /api/workouts with the same interval', async () => {
      const { app } = await givenTwoWorkoutsInTheWeek()

      const called = await callTool(app, { from: FROM, to: TO })
      const response = await app.request(`/api/workouts?from=${FROM}&to=${TO}`)

      expect(called.result?.structuredContent).toEqual(await response.json())
    })
  })

  describe('When tools/list is called through /mcp', () => {
    it('Then list_workouts should be read only and say that to is exclusive, the 92 days and the 03:00Z example', async () => {
      const { app } = createProgramTestApp()

      const listed = await rpc(app, 'tools/list', {})
      const tool = listed.result?.tools?.find(({ name }) => name === 'list_workouts')

      expect({
        readOnlyHint: tool?.annotations?.readOnlyHint,
        mentions: ['exclusive', '92 days', '03:00Z'].filter((part) =>
          tool?.description?.includes(part),
        ),
      }).toEqual({ readOnlyHint: true, mentions: ['exclusive', '92 days', '03:00Z'] })
    })
  })
})

describe('Given a call without the end of the interval', () => {
  describe('When list_workouts is called through /mcp with from and no to', () => {
    it('Then should return isError with workout_range_required in the text and no structuredContent', async () => {
      const { app } = createProgramTestApp()

      const called = await callTool(app, { from: FROM })

      expect({
        isError: called.result?.isError,
        text: JSON.parse(called.result?.content?.[0]?.text ?? 'null'),
        structuredContent: called.result?.structuredContent,
      }).toEqual({
        isError: true,
        text: {
          code: 'workout_range_required',
          message: 'informe o início e o fim do intervalo em UTC',
        },
        structuredContent: undefined,
      })
    })
  })
})

type WorkoutSetup = ProgramTestApp & { programId: string; workoutId: string }

// Letter 'A' with supino-reto and prancha; one finished workout with two sets of supino-reto
// (45.000 g for 10 reps) and prancha skipped.
async function givenFinishedWorkoutWithSkip(
  options: { inProgress?: boolean; skipped?: boolean; plank?: boolean } = {},
): Promise<WorkoutSetup> {
  const testApp = createProgramTestApp()
  const { app, db, clock } = testApp
  const { id: programId } = await sendJson(app, '/api/programs', {
    name: 'Programa 1',
    goal: 'hypertrophy',
  })
  await sendJson(app, `/api/programs/${programId}/days`, { letter: 'A', label: 'Superior' })
  await sendJson(app, `/api/programs/${programId}/days/A/exercises`, {
    exerciseSlug: 'supino-reto',
    sets: 3,
    targetReps: 10,
    loadG: 45000,
    restSeconds: 90,
  })
  await sendJson(app, `/api/programs/${programId}/days/A/exercises`, {
    exerciseSlug: 'prancha',
    sets: 1,
    targetSeconds: 60,
    loadG: 0,
    restSeconds: 60,
  })
  clock.advance(1000)
  const workoutId = recordWorkout(
    db,
    {
      programId,
      letter: 'A',
      startedAt: '2026-11-10T18:00:00.000Z',
      ...(options.inProgress
        ? {}
        : { finishedAt: '2026-11-10T18:40:00.000Z', endReason: 'completed' as const }),
      skippedExerciseSlugs: options.skipped === false || options.plank ? [] : ['prancha'],
      sets: [
        { exerciseSlug: 'supino-reto', loadG: 45000, reps: 10 },
        { exerciseSlug: 'supino-reto', loadG: 45000, reps: 10 },
        ...(options.plank
          ? [{ exerciseSlug: 'prancha', loadG: 0, seconds: 60, setNumber: 1 }]
          : []),
      ],
    },
    clock.now(),
  )
  return { ...testApp, programId, workoutId }
}

function countRowsOfWorkout(db: Database, workoutId: string) {
  return {
    sets: db.select().from(workoutSets).where(eq(workoutSets.workoutId, workoutId)).all().length,
    skips: db.select().from(workoutSkips).where(eq(workoutSkips.workoutId, workoutId)).all().length,
  }
}

async function listWeek(app: App) {
  const listed = await callTool(app, { from: FROM, to: TO })
  return listed.result?.structuredContent as { workouts: { id: string }[] }
}

describe('Given a finished workout with two sets and a skipped exercise', () => {
  describe('When remove_workout is called with the workoutId and no confirmationCode', () => {
    it('Then should return the preview and keep the workout, its sets and the skip', async () => {
      const { app, workoutId } = await givenFinishedWorkoutWithSkip()
      const before = await listWeek(app)

      const called = await callTool(app, { workoutId }, 'remove_workout')
      const after = await listWeek(app)

      expect({
        preview: called.result?.structuredContent,
        history: after,
      }).toEqual({
        preview: {
          applied: false,
          confirmationCode: expect.stringMatching(/^[0-9a-f]{32}$/),
          workout: before.workouts[0],
        },
        history: before,
      })
    })
  })
})

describe('Given the preview of the removal of a finished workout', () => {
  describe('When remove_workout is called again with the confirmationCode of the preview', () => {
    it('Then should apply the removal and leave no workout, set or skip behind', async () => {
      const { app, db, workoutId, programId } = await givenFinishedWorkoutWithSkip()
      const programBefore = await (await app.request(`/api/programs/${programId}`)).text()
      const preview = await callTool(app, { workoutId }, 'remove_workout')
      const { confirmationCode, workout } = contentOf<{
        confirmationCode: string
        workout: unknown
      }>(preview)

      const called = await callTool(app, { workoutId, confirmationCode }, 'remove_workout')

      expect({
        result: called.result?.structuredContent,
        history: await listWeek(app),
        leftovers: countRowsOfWorkout(db, workoutId),
        program: await (await app.request(`/api/programs/${programId}`)).text(),
      }).toEqual({
        result: { applied: true, confirmationCode: null, workout },
        history: { workouts: [] },
        leftovers: { sets: 0, skips: 0 },
        program: programBefore,
      })
    })
  })
})

function contentOf<T>(called: JsonRpcResponse): T {
  return called.result?.structuredContent as T
}

function errorOf(called: JsonRpcResponse) {
  return {
    isError: called.result?.isError,
    text: JSON.parse(called.result?.content?.[0]?.text ?? 'null'),
    structuredContent: called.result?.structuredContent,
  }
}

async function patchJson(app: App, path: string, method: string, body: Record<string, unknown>) {
  await app.request(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function firstSetIdOf(app: App): Promise<string> {
  const history = (await callTool(app, { from: FROM, to: TO })).result?.structuredContent as {
    workouts: { exercises: { sets: { id: string }[] }[] }[]
  }
  return history.workouts[0]?.exercises[0]?.sets[0]?.id ?? ''
}

async function previewCodeOf(app: App, name: string, args: Record<string, unknown>) {
  const preview = await callTool(app, args, name)
  return contentOf<{ confirmationCode: string }>(preview).confirmationCode
}

describe('Given a workout that is missing', () => {
  describe.each([
    ['no workoutId', undefined],
    ['an empty workoutId', ''],
    ['an unknown workoutId', '0193a1b2-0000-7000-8000-00000000ffff'],
  ])('When remove_workout is called with %s', (_name, workoutId) => {
    it.each([
      ['no confirmationCode', undefined],
      ['any confirmationCode', 'abc'],
    ])(
      'And %s, Then should be refused with workout_not_found',
      async (_codeName, confirmationCode) => {
        const { app } = createProgramTestApp()

        const called = await callTool(app, { workoutId, confirmationCode }, 'remove_workout')

        expect(errorOf(called)).toEqual({
          isError: true,
          text: { code: 'workout_not_found', message: 'treino não encontrado' },
          structuredContent: undefined,
        })
      },
    )
  })

  describe('When the confirmed removal is repeated with the same code', () => {
    it('Then should be refused with workout_not_found', async () => {
      const { app, workoutId } = await givenFinishedWorkoutWithSkip()
      const confirmationCode = await previewCodeOf(app, 'remove_workout', { workoutId })
      await callTool(app, { workoutId, confirmationCode }, 'remove_workout')

      const called = await callTool(app, { workoutId, confirmationCode }, 'remove_workout')

      expect(errorOf(called).text).toEqual({
        code: 'workout_not_found',
        message: 'treino não encontrado',
      })
    })
  })
})

function plannedIdOf(db: Database, slug: string): string {
  return (
    db
      .select({ id: plannedExercises.id })
      .from(plannedExercises)
      .innerJoin(exercises, eq(plannedExercises.exerciseId, exercises.id))
      .where(eq(exercises.slug, slug))
      .get()?.id ?? ''
  )
}

const STALE = {
  isError: true,
  text: {
    code: 'workout_confirmation_stale',
    message: 'o treino mudou desde a prévia; peça uma nova prévia',
  },
  structuredContent: undefined,
}

describe('Given the preview of the removal of a workout in progress', () => {
  describe.each([
    [
      'the set is corrected to another value',
      async ({ app, workoutId }: WorkoutSetup) =>
        patchJson(app, `/api/workouts/${workoutId}/sets/${await firstSetIdOf(app)}`, 'PATCH', {
          loadG: 47500,
          reps: 9,
        }),
    ],
    [
      'the workout is finished',
      async ({ app, workoutId }: WorkoutSetup) =>
        patchJson(app, `/api/workouts/${workoutId}/finish`, 'POST', {
          finishedAt: '2026-11-10T18:40:00.000Z',
          endReason: 'completed',
        }),
    ],
    [
      'an exercise is skipped',
      async ({ app, db, workoutId }: WorkoutSetup) =>
        patchJson(app, `/api/workouts/${workoutId}/skips`, 'POST', {
          plannedExerciseId: plannedIdOf(db, 'prancha'),
          skippedAt: '2026-11-10T18:30:00.000Z',
        }),
    ],
  ])('When %s before the confirmation', (_name, change) => {
    it('Then remove_workout should be refused with workout_confirmation_stale and the workout kept with the change', async () => {
      const setup = await givenFinishedWorkoutWithSkip({ inProgress: true, skipped: false })
      const { app, workoutId } = setup
      const confirmationCode = await previewCodeOf(app, 'remove_workout', { workoutId })
      await change(setup)

      const called = await callTool(app, { workoutId, confirmationCode }, 'remove_workout')

      expect({ refusal: errorOf(called), kept: (await listWeek(app)).workouts.length }).toEqual({
        refusal: STALE,
        kept: 1,
      })
    })
  })

  describe('When the confirmation carries a code with one character changed', () => {
    it('Then remove_workout should be refused with workout_confirmation_stale', async () => {
      const { app, workoutId } = await givenFinishedWorkoutWithSkip({ inProgress: true })
      const code = await previewCodeOf(app, 'remove_workout', { workoutId })
      const confirmationCode = `${code[0] === 'a' ? 'b' : 'a'}${code.slice(1)}`

      const called = await callTool(app, { workoutId, confirmationCode }, 'remove_workout')

      expect(errorOf(called)).toEqual(STALE)
    })
  })
})

describe('Given a workout and the preview of its removal', () => {
  describe.each([
    ['an empty confirmationCode', ''],
    ['a confirmationCode with only spaces', '   '],
  ])('When remove_workout is called with %s', (_name, confirmationCode) => {
    it('Then should return a preview and keep the workout', async () => {
      const { app, workoutId } = await givenFinishedWorkoutWithSkip()

      const called = await callTool(app, { workoutId, confirmationCode }, 'remove_workout')

      expect({
        applied: contentOf<{ applied: boolean }>(called).applied,
        kept: (await listWeek(app)).workouts.length,
      }).toEqual({ applied: false, kept: 1 })
    })
  })

  describe('When the label of the letter and the name of the program change before the confirmation', () => {
    it('Then remove_workout should still apply the removal', async () => {
      const { app, workoutId, programId } = await givenFinishedWorkoutWithSkip()
      const confirmationCode = await previewCodeOf(app, 'remove_workout', { workoutId })
      await patchJson(app, `/api/programs/${programId}/days/A`, 'PATCH', { label: 'Empurrar' })
      await patchJson(app, `/api/programs/${programId}`, 'PATCH', { name: 'Programa 2' })

      const called = await callTool(app, { workoutId, confirmationCode }, 'remove_workout')

      expect(contentOf<{ applied: boolean }>(called).applied).toBe(true)
    })
  })
})

describe('Given a workout whose letter left the program and whose program is no longer active', () => {
  async function givenOrphanedWorkout() {
    const setup = await givenFinishedWorkoutWithSkip()
    await sendJson(setup.app, '/api/programs', { name: 'Programa 2', goal: 'strength' })
    await patchJson(setup.app, `/api/programs/${setup.programId}/days/A`, 'DELETE', {})
    return setup
  }

  describe('When update_workout_set is called with the confirmationCode of its preview', () => {
    it('Then should apply the edit', async () => {
      const { app, workoutId } = await givenOrphanedWorkout()
      const request = {
        workoutId,
        setId: await setIdOf(app, 'supino-reto', 2),
        loadG: 42500,
        reps: 8,
      }
      const confirmationCode = await previewCodeOf(app, 'update_workout_set', request)

      const called = await callTool(app, { ...request, confirmationCode }, 'update_workout_set')

      expect(contentOf<{ applied: boolean }>(called).applied).toBe(true)
    })
  })

  describe('When remove_workout is called with the confirmationCode of its preview', () => {
    it('Then should remove the workout', async () => {
      const { app, workoutId } = await givenOrphanedWorkout()
      const confirmationCode = await previewCodeOf(app, 'remove_workout', { workoutId })

      const called = await callTool(app, { workoutId, confirmationCode }, 'remove_workout')

      expect({
        applied: contentOf<{ applied: boolean }>(called).applied,
        kept: (await listWeek(app)).workouts.length,
      }).toEqual({ applied: true, kept: 0 })
    })
  })
})

async function setIdOf(app: App, slug: string, setNumber: number): Promise<string> {
  const history = (await callTool(app, { from: FROM, to: TO })).result?.structuredContent as {
    workouts: {
      exercises: { exercise: { slug: string }; sets: { id: string; setNumber: number }[] }[]
    }[]
  }
  const entry = history.workouts[0]?.exercises.find(({ exercise }) => exercise.slug === slug)
  return entry?.sets.find((set) => set.setNumber === setNumber)?.id ?? ''
}

async function historySetsOf(app: App, slug: string) {
  const history = (await callTool(app, { from: FROM, to: TO })).result?.structuredContent as {
    workouts: { exercises: { exercise: { slug: string }; sets: Record<string, unknown>[] }[] }[]
  }
  return history.workouts[0]?.exercises.find(({ exercise }) => exercise.slug === slug)?.sets
}

describe('Given a workout whose second set of supino-reto has 45000 g and 10 reps', () => {
  describe('When update_workout_set is called with 42500 g and 8 reps and no confirmationCode', () => {
    it('Then should return the preview with before and after and leave the set unchanged', async () => {
      const { app, workoutId } = await givenFinishedWorkoutWithSkip()
      const setId = await setIdOf(app, 'supino-reto', 2)
      const setsBefore = await historySetsOf(app, 'supino-reto')

      const called = await callTool(
        app,
        { workoutId, setId, loadG: 42500, reps: 8 },
        'update_workout_set',
      )

      expect({
        preview: called.result?.structuredContent,
        sets: await historySetsOf(app, 'supino-reto'),
      }).toEqual({
        preview: {
          applied: false,
          confirmationCode: expect.stringMatching(/^[0-9a-f]{32}$/),
          workout: { id: workoutId, letter: 'A', startedAt: '2026-11-10T18:00:00.000Z' },
          exercise: {
            id: expect.any(String),
            slug: 'supino-reto',
            name: 'Supino reto',
            kind: 'reps',
          },
          set: { id: setId, setNumber: 2 },
          before: { loadG: 45000, reps: 10, seconds: null },
          after: { loadG: 42500, reps: 8, seconds: null },
        },
        sets: setsBefore,
      })
    })
  })
})

describe('Given the preview of the edit of the second set of supino-reto', () => {
  describe('When update_workout_set is called again with the same request and the confirmationCode', () => {
    it('Then should apply the edit and keep the identity of the set', async () => {
      const { app, workoutId, clock } = await givenFinishedWorkoutWithSkip()
      const setId = await setIdOf(app, 'supino-reto', 2)
      const request = { workoutId, setId, loadG: 42500, reps: 8 }
      const before = (await historySetsOf(app, 'supino-reto'))?.[1]
      const confirmationCode = await previewCodeOf(app, 'update_workout_set', request)

      const called = await callTool(app, { ...request, confirmationCode }, 'update_workout_set')

      const result = called.result?.structuredContent as Record<string, unknown>
      expect({
        result: { applied: result.applied, code: result.confirmationCode, after: result.after },
        set: (await historySetsOf(app, 'supino-reto'))?.[1],
      }).toEqual({
        result: {
          applied: true,
          code: null,
          after: { loadG: 42500, reps: 8, seconds: null },
        },
        set: {
          ...before,
          loadG: 42500,
          reps: 8,
          correctedAt: clock.now().toISOString(),
        },
      })
    })
  })
})

const NOT_FOUND_WORKOUT = {
  isError: true,
  text: { code: 'workout_not_found', message: 'treino não encontrado' },
  structuredContent: undefined,
}

describe('Given a recorded workout and a request that names a workout that is missing', () => {
  describe.each([
    ['no workoutId', undefined],
    ['an empty workoutId', ''],
    ['an unknown workoutId', '0193a1b2-0000-7000-8000-00000000ffff'],
  ])('When update_workout_set is called with %s', (_name, workoutId) => {
    it.each([
      ['no confirmationCode', undefined],
      ['any confirmationCode', 'abc'],
    ])(
      'And %s, Then should be refused with workout_not_found',
      async (_codeName, confirmationCode) => {
        const { app } = await givenFinishedWorkoutWithSkip()
        const setId = await setIdOf(app, 'supino-reto', 1)

        const called = await callTool(
          app,
          { workoutId, setId, loadG: 42500, reps: 8, confirmationCode },
          'update_workout_set',
        )

        expect(errorOf(called)).toEqual(NOT_FOUND_WORKOUT)
      },
    )
  })
})

describe('Given two workouts and a request whose set is not in the workout', () => {
  describe.each([
    ['no setId', () => undefined],
    ['an empty setId', () => ''],
    ['an unknown setId', () => '0193a1b2-0000-7000-8000-00000000ffff'],
    [
      'the setId of another workout',
      ({ db, otherWorkoutId }: { db: Database; otherWorkoutId: string }) =>
        db.select().from(workoutSets).where(eq(workoutSets.workoutId, otherWorkoutId)).get()?.id,
    ],
  ])('When update_workout_set is called with %s', (_name, pickSetId) => {
    it('Then should be refused with workout_set_not_found and no preview', async () => {
      const { app, db, programId, workoutId, clock } = await givenFinishedWorkoutWithSkip()
      clock.advance(1000)
      const otherWorkoutId = recordWorkout(
        db,
        {
          programId,
          letter: 'A',
          startedAt: '2026-11-11T18:00:00.000Z',
          sets: [{ exerciseSlug: 'supino-reto', loadG: 40000, reps: 10 }],
        },
        clock.now(),
      )

      const called = await callTool(
        app,
        { workoutId, setId: pickSetId({ db, otherWorkoutId }), loadG: 42500, reps: 8 },
        'update_workout_set',
      )

      expect(errorOf(called)).toEqual({
        isError: true,
        text: { code: 'workout_set_not_found', message: 'série não encontrada' },
        structuredContent: undefined,
      })
    })
  })
})

const MEASURE_INVALID = {
  code: 'workout_set_measure_invalid',
  message: 'informe repetições no exercício de repetição e segundos no exercício de tempo',
}

describe('Given a workout with a set of supino-reto and a set of prancha', () => {
  describe.each([
    [
      'no loadG',
      'supino-reto',
      { reps: 8 },
      { code: 'workout_set_load_invalid', message: 'carga inválida' },
    ],
    [
      'loadG -1',
      'supino-reto',
      { loadG: -1, reps: 8 },
      { code: 'workout_set_load_invalid', message: 'carga inválida' },
    ],
    [
      'reps 0',
      'supino-reto',
      { loadG: 40000, reps: 0 },
      { code: 'workout_set_reps_invalid', message: 'repetições inválidas' },
    ],
    [
      'seconds 0 on prancha',
      'prancha',
      { loadG: 0, seconds: 0 },
      { code: 'workout_set_seconds_invalid', message: 'tempo inválido' },
    ],
    [
      'reps and seconds together',
      'supino-reto',
      { loadG: 40000, reps: 8, seconds: 30 },
      MEASURE_INVALID,
    ],
    ['neither reps nor seconds', 'supino-reto', { loadG: 40000 }, MEASURE_INVALID],
    ['seconds on supino-reto', 'supino-reto', { loadG: 40000, seconds: 30 }, MEASURE_INVALID],
    ['reps on prancha', 'prancha', { loadG: 0, reps: 8 }, MEASURE_INVALID],
  ])('When update_workout_set is called with %s', (_name, slug, values, text) => {
    it.each([
      ['no confirmationCode', undefined],
      ['any confirmationCode', 'abc'],
    ])(
      'And %s, Then should be refused with the code of the correction',
      async (_codeName, confirmationCode) => {
        const { app, workoutId } = await givenFinishedWorkoutWithSkip({ plank: true })
        const setId = await setIdOf(app, slug, 1)

        const called = await callTool(
          app,
          { workoutId, setId, ...values, confirmationCode },
          'update_workout_set',
        )

        expect(errorOf(called)).toEqual({ isError: true, text, structuredContent: undefined })
      },
    )
  })
})

type EditCase = {
  name: string
  // What changes after the preview and before the confirmation.
  change?: (setup: WorkoutSetup, request: Record<string, unknown>) => Promise<unknown>
  // What the confirmation sends in place of the preview request.
  override?: (setup: WorkoutSetup) => Promise<Record<string, unknown>>
  // The code the confirmation sends, when it is not the one of the preview.
  codeFrom?: (setup: WorkoutSetup) => Promise<string>
}

const EDIT_CASES: EditCase[] = [
  { name: 'the code is sent in a request for 40000 g', override: async () => ({ loadG: 40000 }) },
  {
    name: 'the code is sent in a request for the second set',
    override: async ({ app }) => ({ setId: await setIdOf(app, 'supino-reto', 2) }),
  },
  {
    name: 'the code comes from the preview of remove_workout',
    codeFrom: ({ app, workoutId }) => previewCodeOf(app, 'remove_workout', { workoutId }),
  },
  {
    name: 'the set is corrected to another value before the confirmation',
    change: async ({ app, workoutId }) =>
      patchJson(
        app,
        `/api/workouts/${workoutId}/sets/${await setIdOf(app, 'supino-reto', 1)}`,
        'PATCH',
        { loadG: 47500, reps: 9 },
      ),
  },
  {
    name: 'the confirmed edit is repeated with the same code',
    change: async ({ app }, request) => callTool(app, request, 'update_workout_set'),
  },
]

describe('Given the preview of the edit of the first set of supino-reto to 42500 g and 8 reps', () => {
  describe.each(EDIT_CASES)('When $name', ({ change, override, codeFrom }) => {
    it('Then update_workout_set should be refused with workout_confirmation_stale and the set keep its value', async () => {
      const setup = await givenFinishedWorkoutWithSkip()
      const { app, workoutId } = setup
      const setId = await setIdOf(app, 'supino-reto', 1)
      const request = { workoutId, setId, loadG: 42500, reps: 8 }
      const previewCode = await previewCodeOf(app, 'update_workout_set', request)
      await change?.(setup, { ...request, confirmationCode: previewCode })
      const setsBefore = await historySetsOf(app, 'supino-reto')
      const confirmationCode = (await codeFrom?.(setup)) ?? previewCode

      const called = await callTool(
        app,
        { ...request, ...(await override?.(setup)), confirmationCode },
        'update_workout_set',
      )

      expect({ refusal: errorOf(called), sets: await historySetsOf(app, 'supino-reto') }).toEqual({
        refusal: STALE,
        sets: setsBefore,
      })
    })
  })
})

describe('Given a set edited to the values it already has', () => {
  describe('When update_workout_set is confirmed, and the confirmation is repeated', () => {
    it('Then should apply both times, show before equal to after and leave correctedAt null', async () => {
      const { app, workoutId } = await givenFinishedWorkoutWithSkip()
      const setId = await setIdOf(app, 'supino-reto', 1)
      const request = { workoutId, setId, loadG: 45000, reps: 10 }
      const preview = contentOf<{ confirmationCode: string; before: unknown; after: unknown }>(
        await callTool(app, request, 'update_workout_set'),
      )
      const confirmed = { ...request, confirmationCode: preview.confirmationCode }

      const first = await callTool(app, confirmed, 'update_workout_set')
      const second = await callTool(app, confirmed, 'update_workout_set')

      expect({
        previewSame: preview.before,
        applied: [first, second].map((call) => contentOf<{ applied: boolean }>(call).applied),
        correctedAt: ((await historySetsOf(app, 'supino-reto')) ?? []).map(
          (set) => set.correctedAt,
        ),
      }).toEqual({
        previewSame: preview.after,
        applied: [true, true],
        correctedAt: [null, null],
      })
    })
  })
})

describe('Given a workout with prancha recorded with no load and 60 seconds', () => {
  describe('When update_workout_set is called for 45 seconds and then confirmed', () => {
    it('Then should preview the time exercise and record 45 seconds', async () => {
      const { app, workoutId } = await givenFinishedWorkoutWithSkip({ plank: true })
      const setId = await setIdOf(app, 'prancha', 1)
      const request = { workoutId, setId, loadG: 0, seconds: 45 }

      const preview = contentOf<{ confirmationCode: string }>(
        await callTool(app, request, 'update_workout_set'),
      )
      await callTool(
        app,
        { ...request, confirmationCode: preview.confirmationCode },
        'update_workout_set',
      )

      expect({
        preview,
        sets: (await historySetsOf(app, 'prancha'))?.map(({ loadG, reps, seconds }) => ({
          loadG,
          reps,
          seconds,
        })),
      }).toEqual({
        preview: {
          applied: false,
          confirmationCode: preview.confirmationCode,
          workout: expect.any(Object),
          exercise: expect.objectContaining({ kind: 'time' }),
          set: { id: setId, setNumber: 1 },
          before: { loadG: 0, reps: null, seconds: 60 },
          after: { loadG: 0, reps: null, seconds: 45 },
        },
        sets: [{ loadG: 0, reps: null, seconds: 45 }],
      })
    })
  })
})

describe('Given the destructive tools of the workouts', () => {
  describe('When tools/list is called through /mcp', () => {
    it('Then update_workout_set and remove_workout should be destructive, not read only, and ask for the confirmation of the PO in the description', async () => {
      const { app } = createProgramTestApp()

      const listed = await rpc(app, 'tools/list', {})
      const tools = ['update_workout_set', 'remove_workout'].map((name) =>
        listed.result?.tools?.find((tool) => tool.name === name),
      )

      expect(
        tools.map((tool) => ({
          destructiveHint: tool?.annotations?.destructiveHint,
          readOnlyHint: tool?.annotations?.readOnlyHint,
          mentions: ['list_workouts', 'confirmationCode', 'confirmation of the PO'].filter((part) =>
            tool?.description?.includes(part),
          ),
        })),
      ).toEqual(
        Array(2).fill({
          destructiveHint: true,
          readOnlyHint: false,
          mentions: ['list_workouts', 'confirmationCode', 'confirmation of the PO'],
        }),
      )
    })
  })
})

describe('Given a workout and the confirmationCode of its removal preview', () => {
  describe('When remove_workout is called without the MCP credential', () => {
    it('Then should answer 401 mcp_unauthenticated and the workout should stay in the history', async () => {
      const { app, db, clock, workoutId } = await givenFinishedWorkoutWithSkip()
      const confirmationCode = await previewCodeOf(app, 'remove_workout', { workoutId })
      const anonymous = createApp({
        nodeEnv: 'test',
        databaseHealth: () => true,
        db,
        now: clock.now,
      })

      const response = await anonymous.request('/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'remove_workout', arguments: { workoutId, confirmationCode } },
        }),
      })

      expect({
        status: response.status,
        body: await response.json(),
        kept: (await listWeek(app)).workouts.length,
      }).toEqual({
        status: 401,
        body: expect.objectContaining({ code: 'mcp_unauthenticated' }),
        kept: 1,
      })
    })
  })
})
