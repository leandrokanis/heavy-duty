import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../db/connection.js'
import { createId } from '../db/id.js'
import { exercises, plannedExercises, programDays, workoutSets, workouts } from '../db/schema.js'

export type RecordWorkoutInput = {
  programId: string
  letter: string
  startedAt: string
  sets: { exerciseSlug: string; loadG: number; reps?: number; seconds?: number }[]
}

export type RecordedWorkout = {
  programId: string
  programDayId: string | null
  letter: string
  startedAt: string
  sets: {
    exerciseSlug: string
    plannedExerciseId: string | null
    loadG: number
    reps: number | null
    seconds: number | null
  }[]
}

// Fixture workout written straight to the tables until US-F03-02 adds the workouts module.
export function recordWorkout(db: Database, input: RecordWorkoutInput, now: Date): string {
  return db.transaction((tx) => {
    const day = tx
      .select({ id: programDays.id })
      .from(programDays)
      .where(and(eq(programDays.programId, input.programId), eq(programDays.letter, input.letter)))
      .get()
    const workoutId = createId(now.getTime())
    tx.insert(workouts)
      .values({
        id: workoutId,
        programId: input.programId,
        programDayId: day?.id ?? null,
        letter: input.letter,
        startedAt: input.startedAt,
      })
      .run()
    input.sets.forEach((set, index) => {
      const exercise = tx
        .select({ id: exercises.id })
        .from(exercises)
        .where(eq(exercises.slug, set.exerciseSlug))
        .get()
      if (!exercise) {
        throw new Error(`Unknown exercise slug in fixture: ${set.exerciseSlug}`)
      }
      const planned = day
        ? tx
            .select({ id: plannedExercises.id })
            .from(plannedExercises)
            .where(
              and(
                eq(plannedExercises.programDayId, day.id),
                eq(plannedExercises.exerciseId, exercise.id),
              ),
            )
            .get()
        : undefined
      tx.insert(workoutSets)
        .values({
          id: createId(now.getTime()),
          workoutId,
          exerciseId: exercise.id,
          plannedExerciseId: planned?.id ?? null,
          setNumber: index + 1,
          loadG: set.loadG,
          reps: set.reps ?? null,
          seconds: set.seconds ?? null,
          performedAt: input.startedAt,
        })
        .run()
    })
    return workoutId
  })
}

export function readWorkout(db: Database, workoutId: string): RecordedWorkout | undefined {
  const workout = db
    .select({
      programId: workouts.programId,
      programDayId: workouts.programDayId,
      letter: workouts.letter,
      startedAt: workouts.startedAt,
    })
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .get()
  if (!workout) {
    return undefined
  }
  const sets = db
    .select({
      exerciseSlug: exercises.slug,
      plannedExerciseId: workoutSets.plannedExerciseId,
      loadG: workoutSets.loadG,
      reps: workoutSets.reps,
      seconds: workoutSets.seconds,
    })
    .from(workoutSets)
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(eq(workoutSets.workoutId, workoutId))
    .orderBy(asc(workoutSets.setNumber))
    .all()
  return { ...workout, sets }
}
