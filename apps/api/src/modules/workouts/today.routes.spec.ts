import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import type { Database } from '../../db/connection.js'
import { exercises, plannedExercises, workoutSets, workouts } from '../../db/schema.js'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'
import { recordWorkout } from '../../test/workouts.js'
import { addExercise } from '../catalog/exercise.service.js'
import { addMuscle } from '../catalog/muscle.service.js'
import type { Today, TodayExercise } from './workouts.schemas.js'

type App = ProgramTestApp['app']

type PlannedInput = {
  exerciseSlug: string
  sets: number
  targetReps?: number
  targetSeconds?: number
  loadG: number
  restSeconds: number
}

const SUPINO_RETO: PlannedInput = {
  exerciseSlug: 'supino-reto',
  sets: 3,
  targetReps: 10,
  loadG: 40000,
  restSeconds: 90,
}

const STARTED_AT = '2026-11-20T18:30:00.000Z'

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

async function addPlanned(app: App, programId: string, letter: string, planned: PlannedInput) {
  await sendJson(app, 'POST', `/api/programs/${programId}/days/${letter}/exercises`, planned)
}

// recordWorkout leaves every fixture workout in progress; this closes one.
function finishWorkout(db: Database, workoutId: string, finishedAt: string) {
  db.update(workouts)
    .set({ finishedAt, endReason: 'completed' })
    .where(eq(workouts.id, workoutId))
    .run()
}

// Ids created in the same millisecond may already sort like set_number;
// reverse them so only set_number can break the tie.
function reverseSetIdOrder(db: Database, workoutId: string) {
  const sets = db
    .select({ id: workoutSets.id, setNumber: workoutSets.setNumber })
    .from(workoutSets)
    .where(eq(workoutSets.workoutId, workoutId))
    .all()
  for (const set of sets) {
    db.update(workoutSets)
      .set({ id: `00000000-0000-7000-8000-${String(1000 - set.setNumber).padStart(12, '0')}` })
      .where(eq(workoutSets.id, set.id))
      .run()
  }
}

async function getToday(app: App): Promise<Today> {
  const response = await app.request('/api/today')
  return (await response.json()) as Today
}

function exerciseIn(today: Today, letter: string, slug: string): TodayExercise | undefined {
  return today.days
    .find((day) => day.letter === letter)
    ?.exercises.find((planned) => planned.exercise.slug === slug)
}

describe('Given the seeded catalog and no program', () => {
  describe('When the athlete requests GET /api/today with a session', () => {
    it('Then should respond 200 with no program, no suggested letter and no days', async () => {
      const { app } = createProgramTestApp()

      const response = await app.request('/api/today')

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 200,
        body: { program: null, suggestedLetter: null, days: [] },
      })
    })
  })
})

describe("Given an older inactive program and the active hypertrophy program with letter 'A' holding supino-reto 3 x 10 at 40000 g with 90 s rest, and no workout", () => {
  describe('When the athlete requests the workout of the day', () => {
    it("Then letter 'A' should bring supino-reto with the program target and load, and the program should bring its name and goal", async () => {
      const { app } = createProgramTestApp()
      const olderId = await createProgram(app, 'Programa antigo')
      await addDay(app, olderId, 'A', 'Antigo')
      const programId = await createProgram(app, 'Programa 1')
      await addDay(app, programId, 'A', 'Superior')
      await addPlanned(app, programId, 'A', SUPINO_RETO)

      const today = await getToday(app)

      expect({
        program: today.program,
        days: today.days.map(({ letter, label }) => ({ letter, label })),
        supino: exerciseIn(today, 'A', 'supino-reto'),
      }).toEqual({
        program: { id: programId, name: 'Programa 1', goal: 'hypertrophy' },
        days: [{ letter: 'A', label: 'Superior' }],
        supino: {
          plannedExerciseId: expect.any(String),
          exercise: {
            id: expect.any(String),
            slug: 'supino-reto',
            name: 'Supino reto',
            kind: 'reps',
          },
          sets: 3,
          targetReps: 10,
          targetSeconds: null,
          restSeconds: 90,
          plannedLoadG: 40000,
          loadG: 40000,
          loadSource: 'program',
          muscleGroups: [{ slug: 'chest', name: 'peito' }],
        },
      })
    })
  })
})

describe('Given an exercise with two primary muscles in chest, one in back and a secondary in triceps, planned in letter A', () => {
  describe('When the athlete requests the workout of the day', () => {
    it('Then the exercise should list the groups of the primary muscles once each, in catalog order', async () => {
      const { app, db } = createProgramTestApp()
      addMuscle(db, { name: 'grande dorsal', muscleGroupSlug: 'back' })
      addMuscle(db, { name: 'peitoral menor', muscleGroupSlug: 'chest' })
      addMuscle(db, { name: 'tríceps braquial', muscleGroupSlug: 'triceps' })
      addExercise(db, {
        name: 'Pullover',
        kind: 'reps',
        primaryMuscleSlugs: ['grande-dorsal', 'peitoral-maior', 'peitoral-menor'],
        secondaryMuscleSlugs: ['triceps-braquial'],
      })
      const programId = await createProgram(app, 'Programa 1')
      await addDay(app, programId, 'A')
      await addPlanned(app, programId, 'A', { ...SUPINO_RETO, exerciseSlug: 'pullover' })

      const pullover = exerciseIn(await getToday(app), 'A', 'pullover')

      expect(pullover?.muscleGroups).toEqual([
        { slug: 'chest', name: 'peito' },
        { slug: 'back', name: 'costas' },
      ])
    })
  })
})

async function givenSupinoInLetterA(testApp: ProgramTestApp = createProgramTestApp()) {
  const { app } = testApp
  const programId = await createProgram(app, 'Programa 1')
  await addDay(app, programId, 'A', 'Superior')
  await addPlanned(app, programId, 'A', SUPINO_RETO)
  return { ...testApp, programId }
}

describe("Given letter 'A' with supino-reto at 40000 g and 10 reps, and a fixture workout with supino-reto at 42500 g for 8 reps", () => {
  describe('When the athlete requests the workout of the day', () => {
    it('Then supino-reto should bring the load of the last workout and the target of the program', async () => {
      const { app, db, clock, programId } = await givenSupinoInLetterA()
      recordWorkout(
        db,
        {
          programId,
          letter: 'A',
          startedAt: STARTED_AT,
          sets: [{ exerciseSlug: 'supino-reto', loadG: 42500, reps: 8 }],
        },
        clock.now(),
      )

      const supino = exerciseIn(await getToday(app), 'A', 'supino-reto')

      expect({
        loadG: supino?.loadG,
        loadSource: supino?.loadSource,
        plannedLoadG: supino?.plannedLoadG,
        targetReps: supino?.targetReps,
      }).toEqual({ loadG: 42500, loadSource: 'last_workout', plannedLoadG: 40000, targetReps: 10 })
    })
  })
})

describe('Given supino-reto in the history at different moments, sets and programs', () => {
  describe('When a finished workout at 40000 g is older than an in-progress workout at 42500 g recorded before it', () => {
    it('Then supino-reto should bring 42500 g from the most recent workout', async () => {
      const { app, db, clock, programId } = await givenSupinoInLetterA()
      recordWorkout(
        db,
        {
          programId,
          letter: 'A',
          startedAt: '2026-11-20T18:30:00.000Z',
          sets: [{ exerciseSlug: 'supino-reto', loadG: 42500, reps: 10 }],
        },
        clock.now(),
      )
      clock.advance(1000)
      const olderId = recordWorkout(
        db,
        {
          programId,
          letter: 'A',
          startedAt: '2026-11-18T18:30:00.000Z',
          sets: [{ exerciseSlug: 'supino-reto', loadG: 40000, reps: 10 }],
        },
        clock.now(),
      )
      finishWorkout(db, olderId, '2026-11-18T19:30:00.000Z')

      const supino = exerciseIn(await getToday(app), 'A', 'supino-reto')

      expect({ loadG: supino?.loadG, loadSource: supino?.loadSource }).toEqual({
        loadG: 42500,
        loadSource: 'last_workout',
      })
    })
  })

  describe('When one workout has sets at 40000 g and then 42500 g at the same performed_at, with ids in the opposite order of the set numbers', () => {
    it('Then supino-reto should bring 42500 g from the highest set number', async () => {
      const { app, db, clock, programId } = await givenSupinoInLetterA()
      const workoutId = recordWorkout(
        db,
        {
          programId,
          letter: 'A',
          startedAt: STARTED_AT,
          sets: [
            { exerciseSlug: 'supino-reto', loadG: 40000, reps: 10 },
            { exerciseSlug: 'supino-reto', loadG: 42500, reps: 10 },
          ],
        },
        clock.now(),
      )
      reverseSetIdOrder(db, workoutId)

      expect(exerciseIn(await getToday(app), 'A', 'supino-reto')?.loadG).toBe(42500)
    })
  })

  describe("When supino-reto was trained at 42500 g in a finished workout of letter 'B' of another program", () => {
    it("Then supino-reto in letter 'A' of the active program should bring 42500 g", async () => {
      const testApp = createProgramTestApp()
      const { app, db, clock } = testApp
      const otherId = await createProgram(app, 'Programa 2')
      await addDay(app, otherId, 'B', 'Peito')
      await addPlanned(app, otherId, 'B', SUPINO_RETO)
      const workoutId = recordWorkout(
        db,
        {
          programId: otherId,
          letter: 'B',
          startedAt: STARTED_AT,
          sets: [{ exerciseSlug: 'supino-reto', loadG: 42500, reps: 10 }],
        },
        clock.now(),
      )
      finishWorkout(db, workoutId, '2026-11-20T19:30:00.000Z')
      await givenSupinoInLetterA(testApp)

      const supino = exerciseIn(await getToday(app), 'A', 'supino-reto')

      expect({ loadG: supino?.loadG, loadSource: supino?.loadSource }).toEqual({
        loadG: 42500,
        loadSource: 'last_workout',
      })
    })
  })
})

describe("Given letter 'A' with prancha 3 x 45 s at 0 g and no workout", () => {
  describe('When the athlete requests the workout of the day', () => {
    it('Then prancha should bring 45 target seconds, no target reps and 0 g from the program', async () => {
      const { app } = createProgramTestApp()
      const programId = await createProgram(app, 'Programa 1')
      await addDay(app, programId, 'A', 'Core')
      await addPlanned(app, programId, 'A', {
        exerciseSlug: 'prancha',
        sets: 3,
        targetSeconds: 45,
        loadG: 0,
        restSeconds: 60,
      })

      expect(exerciseIn(await getToday(app), 'A', 'prancha')).toEqual({
        plannedExerciseId: expect.any(String),
        exercise: { id: expect.any(String), slug: 'prancha', name: 'Prancha', kind: 'time' },
        sets: 3,
        targetReps: null,
        targetSeconds: 45,
        restSeconds: 60,
        plannedLoadG: 0,
        loadG: 0,
        loadSource: 'program',
        muscleGroups: [{ slug: 'abs', name: 'abdômen' }],
      })
    })
  })
})

async function givenProgramWithLetters(testApp: ProgramTestApp, name: string, letters: string[]) {
  const programId = await createProgram(testApp.app, name)
  for (const letter of letters) {
    await addDay(testApp.app, programId, letter)
    await addPlanned(testApp.app, programId, letter, SUPINO_RETO)
  }
  return programId
}

describe("Given the active program with the letters 'A', 'B' and 'C'", () => {
  describe("When its last workout, already finished, was letter 'B'", () => {
    it("Then the suggested letter should be 'C'", async () => {
      const testApp = createProgramTestApp()
      const programId = await givenProgramWithLetters(testApp, 'Programa 1', ['A', 'B', 'C'])
      const workoutId = recordWorkout(
        testApp.db,
        { programId, letter: 'B', startedAt: STARTED_AT, sets: [] },
        testApp.clock.now(),
      )
      finishWorkout(testApp.db, workoutId, '2026-11-20T19:30:00.000Z')

      expect((await getToday(testApp.app)).suggestedLetter).toBe('C')
    })
  })

  describe("When its last workout was letter 'B' and a more recent workout of another program was letter 'A'", () => {
    it("Then the suggested letter should still be 'C'", async () => {
      const testApp = createProgramTestApp()
      const otherId = await givenProgramWithLetters(testApp, 'Programa 2', ['A', 'B'])
      const programId = await givenProgramWithLetters(testApp, 'Programa 1', ['A', 'B', 'C'])
      recordWorkout(
        testApp.db,
        { programId, letter: 'B', startedAt: '2026-11-18T18:30:00.000Z', sets: [] },
        testApp.clock.now(),
      )
      recordWorkout(
        testApp.db,
        { programId: otherId, letter: 'A', startedAt: '2026-11-20T18:30:00.000Z', sets: [] },
        testApp.clock.now(),
      )

      expect((await getToday(testApp.app)).suggestedLetter).toBe('C')
    })
  })

  describe("When a finished workout of letter 'A' is older than an in-progress workout of letter 'B'", () => {
    it("Then the in-progress workout should count and the suggested letter should be 'C'", async () => {
      const testApp = createProgramTestApp()
      const programId = await givenProgramWithLetters(testApp, 'Programa 1', ['A', 'B', 'C'])
      const finishedId = recordWorkout(
        testApp.db,
        { programId, letter: 'A', startedAt: '2026-11-18T18:30:00.000Z', sets: [] },
        testApp.clock.now(),
      )
      finishWorkout(testApp.db, finishedId, '2026-11-18T19:30:00.000Z')
      recordWorkout(
        testApp.db,
        { programId, letter: 'B', startedAt: '2026-11-20T18:30:00.000Z', sets: [] },
        testApp.clock.now(),
      )

      expect((await getToday(testApp.app)).suggestedLetter).toBe('C')
    })
  })
})

describe("Given the active program whose letter 'B' was removed and added again, so the plan order is 'A', 'C', 'B'", () => {
  describe("When its last workout was letter 'C'", () => {
    it("Then the days should come in plan order and the suggested letter should be 'B'", async () => {
      const testApp = createProgramTestApp()
      const programId = await givenProgramWithLetters(testApp, 'Programa 1', ['A', 'B', 'C'])
      await sendJson(testApp.app, 'DELETE', `/api/programs/${programId}/days/B`)
      await addDay(testApp.app, programId, 'B')
      await addPlanned(testApp.app, programId, 'B', SUPINO_RETO)
      recordWorkout(
        testApp.db,
        { programId, letter: 'C', startedAt: STARTED_AT, sets: [] },
        testApp.clock.now(),
      )

      const today = await getToday(testApp.app)

      expect({
        letters: today.days.map(({ letter }) => letter),
        suggestedLetter: today.suggestedLetter,
      }).toEqual({ letters: ['A', 'C', 'B'], suggestedLetter: 'B' })
    })
  })
})

const PRANCHA: PlannedInput = {
  exerciseSlug: 'prancha',
  sets: 3,
  targetSeconds: 45,
  loadG: 0,
  restSeconds: 60,
}

describe("Given letter 'A' with supino-reto 3 x 10 with 90 s rest and prancha 3 x 45 s with 60 s rest", () => {
  describe('When the athlete requests the workout of the day', () => {
    it("Then letter 'A' should bring an estimated duration of 675 seconds", async () => {
      const { app, programId } = await givenSupinoInLetterA()
      await addPlanned(app, programId, 'A', PRANCHA)

      const today = await getToday(app)

      expect(today.days.find((day) => day.letter === 'A')?.estimatedDurationSeconds).toBe(675)
    })
  })
})

describe("Given letter 'A' with supino-reto and prancha", () => {
  describe('When the athlete requests the workout of the day', () => {
    it('Then each exercise should bring the id of its planned exercise row', async () => {
      const { app, db, programId } = await givenSupinoInLetterA()
      await addPlanned(app, programId, 'A', PRANCHA)
      const plannedIdBySlug = new Map(
        db
          .select({ id: plannedExercises.id, slug: exercises.slug })
          .from(plannedExercises)
          .innerJoin(exercises, eq(plannedExercises.exerciseId, exercises.id))
          .all()
          .map(({ id, slug }) => [slug, id]),
      )

      const today = await getToday(app)

      expect(
        today.days[0]?.exercises.map((planned) => ({
          slug: planned.exercise.slug,
          plannedExerciseId: planned.plannedExerciseId,
        })),
      ).toEqual([
        { slug: 'supino-reto', plannedExerciseId: plannedIdBySlug.get('supino-reto') },
        { slug: 'prancha', plannedExerciseId: plannedIdBySlug.get('prancha') },
      ])
    })
  })
})

describe("Given letter 'A' with supino-reto and letter 'B' without exercises", () => {
  describe('When the athlete requests the workout of the day', () => {
    it("Then letter 'B' should come with no exercises and an estimated duration of 0 seconds", async () => {
      const { app, programId } = await givenSupinoInLetterA()
      await addDay(app, programId, 'B', 'Inferior')

      const today = await getToday(app)

      expect(today.days.find((day) => day.letter === 'B')).toEqual({
        letter: 'B',
        label: 'Inferior',
        estimatedDurationSeconds: 0,
        exercises: [],
      })
    })
  })
})

describe("Given supino-reto archived in the catalog after it joined letter 'A'", () => {
  describe('When the athlete requests the workout of the day', () => {
    it("Then letter 'A' should still bring supino-reto with its catalog name", async () => {
      const { app, db } = await givenSupinoInLetterA()
      db.update(exercises)
        .set({ archivedAt: '2026-11-21T09:00:00.000Z' })
        .where(eq(exercises.slug, 'supino-reto'))
        .run()

      const today = await getToday(app)

      expect(today.days[0]?.exercises.map(({ exercise }) => exercise.name)).toEqual(['Supino reto'])
    })
  })
})

describe('Given a program and a fixture workout with two sets', () => {
  describe('When the athlete requests the workout of the day twice', () => {
    it('Then the number of workouts and workout sets should not change', async () => {
      const { app, db, clock, programId } = await givenSupinoInLetterA()
      recordWorkout(
        db,
        {
          programId,
          letter: 'A',
          startedAt: STARTED_AT,
          sets: [
            { exerciseSlug: 'supino-reto', loadG: 40000, reps: 10 },
            { exerciseSlug: 'supino-reto', loadG: 42500, reps: 8 },
          ],
        },
        clock.now(),
      )
      const countRows = () => ({
        workouts: db.select().from(workouts).all().length,
        workoutSets: db.select().from(workoutSets).all().length,
      })
      const before = countRows()

      await app.request('/api/today')
      await app.request('/api/today')

      expect(countRows()).toEqual(before)
    })
  })
})
