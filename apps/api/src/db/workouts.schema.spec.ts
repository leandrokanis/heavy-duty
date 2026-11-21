import { describe, expect, it } from 'vitest'
import {
  addPlannedExercise,
  addProgramDay,
  createProgram,
} from '../modules/programs/program.service.js'
import { createProgramTestApp, PROGRAM_TEST_START } from '../test/programs.js'
import { readWorkout, recordWorkout } from '../test/workouts.js'

const STARTED_AT = '2026-11-20T18:30:00.000Z'

function givenProgramWithLetterC() {
  const { db } = createProgramTestApp()
  const now = PROGRAM_TEST_START
  const program = createProgram(db, { name: 'Programa 1', goal: 'hypertrophy' }, now)
  addProgramDay(db, program.id, { letter: 'C' }, now)
  addPlannedExercise(
    db,
    program.id,
    'C',
    { exerciseSlug: 'supino-reto', sets: 3, targetReps: 10, loadG: 60000, restSeconds: 90 },
    now,
  )
  const workoutId = recordWorkout(
    db,
    {
      programId: program.id,
      letter: 'C',
      startedAt: STARTED_AT,
      sets: [{ exerciseSlug: 'supino-reto', loadG: 60000, reps: 10 }],
    },
    now,
  )
  return { db, programId: program.id, workoutId }
}

describe("Given a workout of letter 'C' with supino-reto at loadG 60000", () => {
  describe("When the program_days row of 'C' is deleted", () => {
    it('Then the workout should keep letter, programId, startedAt and the set, with programDayId and plannedExerciseId null', () => {
      const { db, programId, workoutId } = givenProgramWithLetterC()

      db.$client.prepare("DELETE FROM program_days WHERE letter = 'C'").run()

      expect(readWorkout(db, workoutId)).toEqual({
        programId,
        programDayId: null,
        letter: 'C',
        startedAt: STARTED_AT,
        sets: [
          {
            exerciseSlug: 'supino-reto',
            plannedExerciseId: null,
            loadG: 60000,
            reps: 10,
            seconds: null,
          },
        ],
      })
    })
  })
})

// RESTRICT surfaces as SQLITE_CONSTRAINT_TRIGGER, so the message tells the rule apart.
function errorOf(action: () => unknown): string | undefined {
  try {
    action()
    return undefined
  } catch (error) {
    return (error as Error).message
  }
}

function givenWorkoutWithPrancha() {
  const given = givenProgramWithLetterC()
  const workoutId = recordWorkout(
    given.db,
    {
      programId: given.programId,
      letter: 'C',
      startedAt: STARTED_AT,
      sets: [{ exerciseSlug: 'prancha', loadG: 0, seconds: 45 }],
    },
    PROGRAM_TEST_START,
  )
  return { ...given, workoutId, before: readWorkout(given.db, workoutId) }
}

describe('Given a recorded workout', () => {
  describe('When the program row is deleted', () => {
    it('Then should throw a foreign key error and keep the workout', () => {
      const { db, programId, workoutId, before } = givenWorkoutWithPrancha()

      const error = errorOf(() =>
        db.$client.prepare('DELETE FROM programs WHERE id = ?').run(programId),
      )

      expect({ error, after: readWorkout(db, workoutId) }).toEqual({
        error: 'FOREIGN KEY constraint failed',
        after: before,
      })
    })
  })

  describe('When the row of an exercise used only by the workout is deleted', () => {
    it('Then should throw a foreign key error and keep the workout', () => {
      const { db, workoutId, before } = givenWorkoutWithPrancha()

      const error = errorOf(() =>
        db.$client.prepare("DELETE FROM exercises WHERE slug = 'prancha'").run(),
      )

      expect({ error, after: readWorkout(db, workoutId) }).toEqual({
        error: 'FOREIGN KEY constraint failed',
        after: before,
      })
    })
  })

  describe.each([
    { input: 'both reps and seconds', set: { reps: 10, seconds: 45 } },
    { input: 'neither reps nor seconds', set: {} },
  ])('When a set is inserted with $input', ({ set }) => {
    it('Then should throw a check constraint error', () => {
      const { db, programId } = givenProgramWithLetterC()

      const error = errorOf(() =>
        recordWorkout(
          db,
          {
            programId,
            letter: 'C',
            startedAt: STARTED_AT,
            sets: [{ exerciseSlug: 'supino-reto', loadG: 60000, ...set }],
          },
          PROGRAM_TEST_START,
        ),
      )

      expect(error).toBe('CHECK constraint failed: workout_sets_single_measure_check')
    })
  })
})

function insertSetRow(
  db: ReturnType<typeof givenProgramWithLetterC>['db'],
  workoutId: string,
  setNumber: number,
) {
  const first = db.$client
    .prepare('SELECT exercise_id AS exerciseId FROM workout_sets WHERE workout_id = ?')
    .get(workoutId) as { exerciseId: string }
  db.$client
    .prepare(
      `INSERT INTO workout_sets (id, workout_id, exercise_id, set_number, load_g, reps, performed_at)
       VALUES (?, ?, ?, ?, 60000, 10, ?)`,
    )
    .run(
      `0193a1b2-0000-7000-8000-00000000070${setNumber}`,
      workoutId,
      first.exerciseId,
      setNumber,
      STARTED_AT,
    )
}

describe('Given a workout with set 1 of supino-reto', () => {
  describe('When another row with the same workout, exercise and set number is inserted', () => {
    it('Then should throw a unique constraint error', () => {
      const { db, workoutId } = givenProgramWithLetterC()

      const error = errorOf(() => insertSetRow(db, workoutId, 1))

      expect(error).toBe(
        'UNIQUE constraint failed: workout_sets.workout_id, workout_sets.exercise_id, workout_sets.set_number',
      )
    })
  })

  describe('When a row with set number 2 is inserted', () => {
    it('Then should be accepted', () => {
      const { db, workoutId } = givenProgramWithLetterC()

      expect(errorOf(() => insertSetRow(db, workoutId, 2))).toBeUndefined()
    })
  })
})

const SKIPPED_AT = '2026-11-20T18:40:00.000Z'

function givenWorkoutWithSkippedPrancha() {
  const { db } = createProgramTestApp()
  const now = PROGRAM_TEST_START
  const program = createProgram(db, { name: 'Programa 1', goal: 'hypertrophy' }, now)
  addProgramDay(db, program.id, { letter: 'C' }, now)
  addPlannedExercise(
    db,
    program.id,
    'C',
    { exerciseSlug: 'supino-reto', sets: 3, targetReps: 10, loadG: 60000, restSeconds: 90 },
    now,
  )
  addPlannedExercise(
    db,
    program.id,
    'C',
    { exerciseSlug: 'prancha', sets: 3, targetSeconds: 45, loadG: 0, restSeconds: 60 },
    now,
  )
  const workoutId = recordWorkout(
    db,
    {
      programId: program.id,
      letter: 'C',
      startedAt: STARTED_AT,
      sets: [{ exerciseSlug: 'supino-reto', loadG: 60000, reps: 10 }],
    },
    now,
  )
  const prancha = db.$client
    .prepare(
      `SELECT p.id AS plannedExerciseId, p.exercise_id AS exerciseId
       FROM planned_exercises p JOIN exercises e ON e.id = p.exercise_id WHERE e.slug = 'prancha'`,
    )
    .get() as { plannedExerciseId: string; exerciseId: string }
  insertSkipRow(db, workoutId, prancha)
  return { db, workoutId, prancha }
}

function insertSkipRow(
  db: ReturnType<typeof givenProgramWithLetterC>['db'],
  workoutId: string,
  prancha: { plannedExerciseId: string; exerciseId: string },
) {
  db.$client
    .prepare(
      `INSERT INTO workout_skips (workout_id, exercise_id, planned_exercise_id, skipped_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(workoutId, prancha.exerciseId, prancha.plannedExerciseId, SKIPPED_AT)
}

function readSkipRows(db: ReturnType<typeof givenProgramWithLetterC>['db'], workoutId: string) {
  return db.$client
    .prepare(
      `SELECT exercise_id AS exerciseId, planned_exercise_id AS plannedExerciseId, skipped_at AS skippedAt
       FROM workout_skips WHERE workout_id = ?`,
    )
    .all(workoutId)
}

describe('Given a workout with a skip of prancha', () => {
  describe('When the planner removes prancha from the day', () => {
    it('Then the skip should stay with planned_exercise_id null and exercise_id kept', () => {
      const { db, workoutId, prancha } = givenWorkoutWithSkippedPrancha()

      db.$client
        .prepare('DELETE FROM planned_exercises WHERE id = ?')
        .run(prancha.plannedExerciseId)

      expect(readSkipRows(db, workoutId)).toEqual([
        { exerciseId: prancha.exerciseId, plannedExerciseId: null, skippedAt: SKIPPED_AT },
      ])
    })
  })

  describe('When a second skip of the same exercise is inserted in the same workout', () => {
    it('Then should throw a primary key error', () => {
      const { db, workoutId, prancha } = givenWorkoutWithSkippedPrancha()

      const error = errorOf(() => insertSkipRow(db, workoutId, prancha))

      expect(error).toBe(
        'UNIQUE constraint failed: workout_skips.workout_id, workout_skips.exercise_id',
      )
    })
  })

  describe('When the workout is deleted', () => {
    it('Then the skip should be deleted with it', () => {
      const { db, workoutId } = givenWorkoutWithSkippedPrancha()

      db.$client.prepare('DELETE FROM workouts WHERE id = ?').run(workoutId)

      expect(readSkipRows(db, workoutId)).toEqual([])
    })
  })
})
