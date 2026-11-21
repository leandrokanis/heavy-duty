import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { API_DATABASE_PATH } from './api-server.js'

export type WorkoutSetInput = {
  exerciseSlug: string
  loadG: number
  reps?: number
  seconds?: number
}

export type RecordedWorkout = {
  letter: string
  startedAt: string
  sets: { exerciseSlug: string; loadG: number; reps: number | null; seconds: number | null }[]
}

const STARTED_AT = '2026-11-20T18:30:00.000Z'

// The route of US-F03-02 refuses workouts in the past and sets without a planned
// exercise, so fixture workouts go straight to the API database.
function withDatabase<T>(action: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(API_DATABASE_PATH)
  try {
    db.exec('PRAGMA foreign_keys = ON')
    db.exec('PRAGMA busy_timeout = 5000')
    return action(db)
  } finally {
    db.close()
  }
}

export function recordWorkout(
  programId: string,
  letter: string,
  sets: readonly WorkoutSetInput[],
  startedAt: string = STARTED_AT,
): string {
  return withDatabase((db) => {
    const workoutId = randomUUID()
    db.exec('BEGIN IMMEDIATE')
    try {
      const day = db
        .prepare('SELECT id FROM program_days WHERE program_id = ? AND letter = ?')
        .get(programId, letter) as { id: string } | undefined
      db.prepare(
        'INSERT INTO workouts (id, program_id, program_day_id, letter, started_at) VALUES (?, ?, ?, ?, ?)',
      ).run(workoutId, programId, day?.id ?? null, letter, startedAt)
      sets.forEach((set, index) => {
        const exercise = db
          .prepare('SELECT id FROM exercises WHERE slug = ?')
          .get(set.exerciseSlug) as { id: string } | undefined
        if (!exercise) {
          throw new Error(`Exercise "${set.exerciseSlug}" is not registered`)
        }
        const planned = db
          .prepare('SELECT id FROM planned_exercises WHERE program_day_id = ? AND exercise_id = ?')
          .get(day?.id ?? null, exercise.id) as { id: string } | undefined
        db.prepare(
          `INSERT INTO workout_sets
             (id, workout_id, exercise_id, planned_exercise_id, set_number, load_g, reps, seconds, performed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          randomUUID(),
          workoutId,
          exercise.id,
          planned?.id ?? null,
          index + 1,
          set.loadG,
          set.reps ?? null,
          set.seconds ?? null,
          startedAt,
        )
      })
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    return workoutId
  })
}

export function readWorkout(workoutId: string): RecordedWorkout | undefined {
  return withDatabase((db) => {
    const workout = db
      .prepare('SELECT letter, started_at AS startedAt FROM workouts WHERE id = ?')
      .get(workoutId) as { letter: string; startedAt: string } | undefined
    if (!workout) {
      return undefined
    }
    const sets = db
      .prepare(
        `SELECT e.slug AS exerciseSlug, s.load_g AS loadG, s.reps AS reps, s.seconds AS seconds
           FROM workout_sets s JOIN exercises e ON e.id = s.exercise_id
          WHERE s.workout_id = ? ORDER BY s.set_number`,
      )
      .all(workoutId) as RecordedWorkout['sets']
    return { letter: workout.letter, startedAt: workout.startedAt, sets }
  })
}

export type RecordedSetRow = {
  id: string
  exerciseSlug: string
  setNumber: number
  loadG: number
  reps: number | null
  seconds: number | null
}

export function readWorkoutSets(workoutId: string): RecordedSetRow[] {
  return withDatabase(
    (db) =>
      db
        .prepare(
          `SELECT s.id AS id, e.slug AS exerciseSlug, s.set_number AS setNumber, s.load_g AS loadG,
                  s.reps AS reps, s.seconds AS seconds
             FROM workout_sets s JOIN exercises e ON e.id = s.exercise_id
            WHERE s.workout_id = ? ORDER BY s.set_number`,
        )
        .all(workoutId) as RecordedSetRow[],
  )
}

// The e2e database is thrown away on every run, so the workout of the day scenarios
// start from an empty history instead of the fixture workouts of US-F02-02.
export function clearWorkouts(): void {
  withDatabase((db) => {
    db.exec('DELETE FROM workouts')
  })
}

export function deactivatePrograms(): void {
  withDatabase((db) => {
    db.exec('UPDATE programs SET is_active = 0 WHERE is_active = 1')
  })
}
