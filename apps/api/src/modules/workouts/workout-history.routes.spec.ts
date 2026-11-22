import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'
import { recordWorkout } from '../../test/workouts.js'
import type { WorkoutHistory } from './workouts.schemas.js'

type App = ProgramTestApp['app']

function sendJson(app: App, method: string, path: string, body?: Record<string, unknown>) {
  return app.request(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function createProgram(app: App, name: string): Promise<string> {
  const response = await sendJson(app, 'POST', '/api/programs', { name, goal: 'hypertrophy' })
  return ((await response.json()) as { id: string }).id
}

async function addDay(app: App, programId: string, letter: string, label: string | null = null) {
  await sendJson(app, 'POST', `/api/programs/${programId}/days`, { letter, label })
}

async function addPlanned(app: App, programId: string, letter: string, slug: string) {
  const isTime = slug === 'prancha'
  await sendJson(app, 'POST', `/api/programs/${programId}/days/${letter}/exercises`, {
    exerciseSlug: slug,
    sets: 3,
    ...(isTime ? { targetSeconds: 45 } : { targetReps: 10 }),
    loadG: isTime ? 0 : 40000,
    restSeconds: 60,
  })
}

async function getHistory(app: App, from: string, to: string): Promise<WorkoutHistory> {
  const response = await app.request(`/api/workouts?from=${from}&to=${to}`)
  return (await response.json()) as WorkoutHistory
}

const WEEK_FROM = '2026-11-09T03:00:00.000Z'
const WEEK_TO = '2026-11-16T03:00:00.000Z'

describe('Given a database with no workout in the week', () => {
  describe('When GET /api/workouts asks for the week from Monday to the next Monday in UTC', () => {
    it('Then should respond 200 with an empty list of workouts', async () => {
      const { app } = createProgramTestApp()

      const response = await app.request(`/api/workouts?from=${WEEK_FROM}&to=${WEEK_TO}`)

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 200,
        body: { workouts: [] },
      })
    })
  })
})

const RANGE_REQUIRED = {
  code: 'workout_range_required',
  message: 'informe o início e o fim do intervalo em UTC',
}

describe('Given a range that is not a pair of existing UTC instants', () => {
  describe.each([
    ['without from', `to=${WEEK_TO}`],
    ['without to', `from=${WEEK_FROM}`],
    ['with an empty from', `from=&to=${WEEK_TO}`],
    ['with an instant without the Z', `from=2026-11-09T03:00:00&to=${WEEK_TO}`],
    ['with a date only', `from=2026-11-09&to=${WEEK_TO}`],
    ['with a date that does not exist', `from=2026-02-30T03:00:00Z&to=${WEEK_TO}`],
  ])('When GET /api/workouts arrives %s', (_label, query) => {
    it('Then should respond 400 workout_range_required with the message of the PRD', async () => {
      const { app } = createProgramTestApp()

      const response = await app.request(`/api/workouts?${query}`)

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 400,
        body: RANGE_REQUIRED,
      })
    })
  })
})

describe('Given a range whose end is not after its start', () => {
  describe.each([
    ['to equal to from', WEEK_FROM],
    ['to one second before from', '2026-11-09T02:59:59.000Z'],
  ])('When GET /api/workouts arrives with %s', (_label, to) => {
    it('Then should respond 400 workout_range_inverted with the message of the PRD', async () => {
      const { app } = createProgramTestApp()

      const response = await app.request(`/api/workouts?from=${WEEK_FROM}&to=${to}`)

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 400,
        body: {
          code: 'workout_range_inverted',
          message: 'o fim do intervalo deve ser depois do início',
        },
      })
    })
  })
})

const DAY_MS = 24 * 60 * 60 * 1000

describe('Given a range of 92 days', () => {
  describe('When GET /api/workouts arrives with a range of 92 days and 1 millisecond', () => {
    it('Then should respond 400 workout_range_too_long with the message of the PRD', async () => {
      const { app } = createProgramTestApp()
      const to = new Date(Date.parse(WEEK_FROM) + 92 * DAY_MS + 1).toISOString()

      const response = await app.request(`/api/workouts?from=${WEEK_FROM}&to=${to}`)

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 400,
        body: {
          code: 'workout_range_too_long',
          message: 'o intervalo deve ter no máximo 92 dias',
        },
      })
    })
  })

  describe('When GET /api/workouts arrives with a range of exactly 92 days', () => {
    it('Then should respond 200', async () => {
      const { app } = createProgramTestApp()
      const to = new Date(Date.parse(WEEK_FROM) + 92 * DAY_MS).toISOString()

      const response = await app.request(`/api/workouts?from=${WEEK_FROM}&to=${to}`)

      expect(response.status).toBe(200)
    })
  })
})

type WeekFixture = { testApp: ProgramTestApp; ids: Record<string, string>; secondProgramId: string }

// Program 1 has letters A ("Superior"), B and C; program 2 (the active one) has letter A.
// The workouts are recorded out of chronological order, with neighbours around the week.
async function givenWorkoutsAroundTheWeek(): Promise<WeekFixture> {
  const testApp = createProgramTestApp()
  const { app, db, clock } = testApp
  const firstProgramId = await createProgram(app, 'Programa 1')
  await addDay(app, firstProgramId, 'A', 'Superior')
  await addDay(app, firstProgramId, 'B')
  await addDay(app, firstProgramId, 'C')
  for (const letter of ['A', 'B', 'C']) {
    await addPlanned(app, firstProgramId, letter, 'supino-reto')
  }
  const secondProgramId = await createProgram(app, 'Programa 2')
  await addDay(app, secondProgramId, 'A')
  await addPlanned(app, secondProgramId, 'A', 'supino-reto')

  const record = (
    key: string,
    programId: string,
    letter: string,
    startedAt: string,
    extra: { finishedAt?: string; endReason?: 'completed' | 'ended_early' } = {},
  ) => {
    clock.advance(1000)
    return [
      key,
      recordWorkout(
        db,
        {
          programId,
          letter,
          startedAt,
          ...extra,
          sets: [
            { exerciseSlug: 'supino-reto', loadG: 40000, reps: 10 },
            { exerciseSlug: 'supino-reto', loadG: 42500, reps: 8, setNumber: 2 },
          ],
        },
        clock.now(),
      ),
    ] as const
  }
  const ids = Object.fromEntries([
    record('after', firstProgramId, 'A', '2026-11-18T12:00:00.000Z'),
    record('atTo', firstProgramId, 'A', WEEK_TO),
    record('third', firstProgramId, 'C', '2026-11-14T12:00:00.000Z'),
    record('before', firstProgramId, 'A', '2026-11-09T02:59:59.999Z'),
    record('second', secondProgramId, 'A', '2026-11-11T12:00:00.000Z', {
      finishedAt: '2026-11-11T12:50:00.000Z',
      endReason: 'ended_early',
    }),
    record('first', firstProgramId, 'A', WEEK_FROM, {
      finishedAt: '2026-11-09T04:10:00.000Z',
      endReason: 'completed',
    }),
  ])
  return { testApp, ids, secondProgramId }
}

describe('Given workouts in the week and in the neighbour weeks, recorded out of order', () => {
  describe('When GET /api/workouts asks for the week', () => {
    it('Then should bring the three workouts of the week, oldest first, with the one at from and without the one at to', async () => {
      const { testApp, ids } = await givenWorkoutsAroundTheWeek()

      const history = await getHistory(testApp.app, WEEK_FROM, WEEK_TO)

      expect(history.workouts.map((workout) => workout.id)).toEqual([
        ids.first,
        ids.second,
        ids.third,
      ])
    })

    it('Then the workout still in progress should bring a null finish and a null end reason', async () => {
      const { testApp } = await givenWorkoutsAroundTheWeek()

      const history = await getHistory(testApp.app, WEEK_FROM, WEEK_TO)

      expect(
        history.workouts.map(({ finishedAt, endReason }) => ({ finishedAt, endReason })),
      ).toEqual([
        { finishedAt: '2026-11-09T04:10:00.000Z', endReason: 'completed' },
        { finishedAt: '2026-11-11T12:50:00.000Z', endReason: 'ended_early' },
        { finishedAt: null, endReason: null },
      ])
    })

    it('Then each workout should bring its program, letter and the current label of the letter', async () => {
      const { testApp, secondProgramId } = await givenWorkoutsAroundTheWeek()

      const history = await getHistory(testApp.app, WEEK_FROM, WEEK_TO)

      expect(
        history.workouts.map(({ program, letter, label }) => ({
          programName: program.name,
          programIsSecond: program.id === secondProgramId,
          letter,
          label,
        })),
      ).toEqual([
        { programName: 'Programa 1', programIsSecond: false, letter: 'A', label: 'Superior' },
        { programName: 'Programa 2', programIsSecond: true, letter: 'A', label: null },
        { programName: 'Programa 1', programIsSecond: false, letter: 'C', label: null },
      ])
    })

    it('Then each workout should bring its exercise with the name and the sets with load and reps', async () => {
      const { testApp } = await givenWorkoutsAroundTheWeek()

      const history = await getHistory(testApp.app, WEEK_FROM, WEEK_TO)

      expect(
        history.workouts[0]?.exercises.map(({ exercise, sets }) => ({
          name: exercise.name,
          sets: sets.map(({ setNumber, loadG, reps }) => ({ setNumber, loadG, reps })),
        })),
      ).toEqual([
        {
          name: 'Supino reto',
          sets: [
            { setNumber: 1, loadG: 40000, reps: 10 },
            { setNumber: 2, loadG: 42500, reps: 8 },
          ],
        },
      ])
    })
  })
})

describe('Given a workout whose first set was prancha, before the supino-reto sets recorded out of order', () => {
  describe('When GET /api/workouts asks for the interval of the workout', () => {
    it('Then should bring prancha first with seconds, null reps and load 0, and the sets of each exercise by set number', async () => {
      const { app, db, clock } = createProgramTestApp()
      const programId = await createProgram(app, 'Programa 1')
      await addDay(app, programId, 'A')
      await addPlanned(app, programId, 'A', 'supino-reto')
      await addPlanned(app, programId, 'A', 'prancha')
      recordWorkout(
        db,
        {
          programId,
          letter: 'A',
          startedAt: '2026-11-10T18:00:00.000Z',
          sets: [
            {
              exerciseSlug: 'supino-reto',
              loadG: 42500,
              reps: 8,
              setNumber: 2,
              performedAt: '2026-11-10T18:03:00.000Z',
            },
            {
              exerciseSlug: 'supino-reto',
              loadG: 40000,
              reps: 10,
              setNumber: 1,
              performedAt: '2026-11-10T18:03:00.000Z',
            },
            {
              exerciseSlug: 'prancha',
              loadG: 0,
              seconds: 45,
              setNumber: 1,
              performedAt: '2026-11-10T18:01:00.000Z',
            },
          ],
        },
        clock.now(),
      )

      const history = await getHistory(app, WEEK_FROM, WEEK_TO)

      expect(
        history.workouts[0]?.exercises.map(({ exercise, sets }) => ({
          name: exercise.name,
          sets: sets.map(({ setNumber, loadG, reps, seconds, performedAt, correctedAt }) => ({
            setNumber,
            loadG,
            reps,
            seconds,
            performedAt,
            correctedAt,
          })),
        })),
      ).toEqual([
        {
          name: 'Prancha',
          sets: [
            {
              setNumber: 1,
              loadG: 0,
              reps: null,
              seconds: 45,
              performedAt: '2026-11-10T18:01:00.000Z',
              correctedAt: null,
            },
          ],
        },
        {
          name: 'Supino reto',
          sets: [
            {
              setNumber: 1,
              loadG: 40000,
              reps: 10,
              seconds: null,
              performedAt: '2026-11-10T18:03:00.000Z',
              correctedAt: null,
            },
            {
              setNumber: 2,
              loadG: 42500,
              reps: 8,
              seconds: null,
              performedAt: '2026-11-10T18:03:00.000Z',
              correctedAt: null,
            },
          ],
        },
      ])
    })
  })
})

describe('Given a workout ended early with prancha skipped and supino-reto skipped and done later', () => {
  describe('When GET /api/workouts asks for the interval of the workout', () => {
    it('Then leftOut should bring only prancha, and supino-reto should stay in exercises with its sets', async () => {
      const { app, db, clock } = createProgramTestApp()
      const programId = await createProgram(app, 'Programa 1')
      await addDay(app, programId, 'A')
      await addPlanned(app, programId, 'A', 'supino-reto')
      await addPlanned(app, programId, 'A', 'prancha')
      recordWorkout(
        db,
        {
          programId,
          letter: 'A',
          startedAt: '2026-11-10T18:00:00.000Z',
          finishedAt: '2026-11-10T18:20:00.000Z',
          endReason: 'ended_early',
          skippedExerciseSlugs: ['prancha', 'supino-reto'],
          sets: [{ exerciseSlug: 'supino-reto', loadG: 40000, reps: 10 }],
        },
        clock.now(),
      )

      const workout = (await getHistory(app, WEEK_FROM, WEEK_TO)).workouts[0]

      expect({
        endReason: workout?.endReason,
        leftOut: workout?.leftOut.map(({ slug, name, kind }) => ({ slug, name, kind })),
        done: workout?.exercises.map(({ exercise, sets }) => [exercise.slug, sets.length]),
      }).toEqual({
        endReason: 'ended_early',
        leftOut: [{ slug: 'prancha', name: 'Prancha', kind: 'time' }],
        done: [['supino-reto', 1]],
      })
    })
  })
})

describe('Given a workout just opened, with no set and no skip', () => {
  describe('When GET /api/workouts asks for the interval of the workout', () => {
    it('Then should bring the workout with empty exercises and an empty leftOut', async () => {
      const { app, db, clock } = createProgramTestApp()
      const programId = await createProgram(app, 'Programa 1')
      await addDay(app, programId, 'A')
      recordWorkout(
        db,
        { programId, letter: 'A', startedAt: '2026-11-10T18:00:00.000Z', sets: [] },
        clock.now(),
      )

      const workout = (await getHistory(app, WEEK_FROM, WEEK_TO)).workouts[0]

      expect({ exercises: workout?.exercises, leftOut: workout?.leftOut }).toEqual({
        exercises: [],
        leftOut: [],
      })
    })
  })
})

describe('Given a workout of letter B with supino-reto sets, and letter B removed from the program afterwards', () => {
  describe('When GET /api/workouts asks for the interval of the workout', () => {
    it('Then should bring letter B with a null label, supino-reto and the recorded load and reps', async () => {
      const { app, db, clock } = createProgramTestApp()
      const programId = await createProgram(app, 'Programa 1')
      await addDay(app, programId, 'A')
      await addDay(app, programId, 'B', 'Inferior')
      await addPlanned(app, programId, 'B', 'supino-reto')
      recordWorkout(
        db,
        {
          programId,
          letter: 'B',
          startedAt: '2026-11-10T18:00:00.000Z',
          sets: [{ exerciseSlug: 'supino-reto', loadG: 42500, reps: 8 }],
        },
        clock.now(),
      )
      await sendJson(app, 'DELETE', `/api/programs/${programId}/days/B`)

      const workout = (await getHistory(app, WEEK_FROM, WEEK_TO)).workouts[0]

      expect({
        letter: workout?.letter,
        label: workout?.label,
        exercises: workout?.exercises.map(({ exercise, sets }) => ({
          slug: exercise.slug,
          sets: sets.map(({ loadG, reps }) => ({ loadG, reps })),
        })),
      }).toEqual({
        letter: 'B',
        label: null,
        exercises: [{ slug: 'supino-reto', sets: [{ loadG: 42500, reps: 8 }] }],
      })
    })
  })
})

describe('Given a workout inside the interval and a request without the session cookie', () => {
  describe('When GET /api/workouts arrives', () => {
    it('Then should respond 401 unauthenticated and a body with no workouts', async () => {
      const { testApp } = await givenWorkoutsAroundTheWeek()
      const anonymous = createApp({
        nodeEnv: 'test',
        databaseHealth: () => true,
        db: testApp.db,
      })

      const response = await anonymous.request(`/api/workouts?from=${WEEK_FROM}&to=${WEEK_TO}`)

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 401,
        body: { code: 'unauthenticated', message: 'Entre com a sua chave de acesso.' },
      })
    })
  })
})
