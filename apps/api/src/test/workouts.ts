import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../db/connection.js'
import { createId } from '../db/id.js'
import {
  exercises,
  plannedExercises,
  programDays,
  workoutSets,
  workoutSkips,
  workouts,
} from '../db/schema.js'
import { countPlannedGroupSets } from '../modules/workouts/workout.repository.js'

export type RecordWorkoutInput = {
  programId: string
  letter: string
  startedAt: string
  finishedAt?: string
  endReason?: 'completed' | 'ended_early'
  skippedExerciseSlugs?: string[]
  sets: {
    exerciseSlug: string
    loadG: number
    reps?: number
    seconds?: number
    setNumber?: number
    performedAt?: string
  }[]
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

// Fixture workout written straight to the tables: the set route refuses past workouts and
// sets without a planned exercise, which history fixtures need.
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
        finishedAt: input.finishedAt ?? null,
        endReason: input.endReason ?? null,
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
      const planned = findPlanned(tx, day?.id, exercise.id)
      tx.insert(workoutSets)
        .values({
          id: createId(now.getTime()),
          workoutId,
          exerciseId: exercise.id,
          plannedExerciseId: planned?.id ?? null,
          plannedLoadG: planned?.loadG ?? null,
          targetReps: planned?.targetReps ?? null,
          targetSeconds: planned?.targetSeconds ?? null,
          plannedGroupSets: day ? countPlannedGroupSets(db, day.id, exercise.id) : null,
          setNumber: set.setNumber ?? index + 1,
          loadG: set.loadG,
          reps: set.reps ?? null,
          seconds: set.seconds ?? null,
          performedAt: set.performedAt ?? input.startedAt,
        })
        .run()
    })
    for (const slug of input.skippedExerciseSlugs ?? []) {
      const exercise = tx
        .select({ id: exercises.id })
        .from(exercises)
        .where(eq(exercises.slug, slug))
        .get()
      if (!exercise) {
        throw new Error(`Unknown exercise slug in fixture: ${slug}`)
      }
      const planned = findPlannedId(tx, day?.id, exercise.id)
      tx.insert(workoutSkips)
        .values({
          workoutId,
          exerciseId: exercise.id,
          plannedExerciseId: planned,
          skippedAt: input.startedAt,
        })
        .run()
    }
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

type PlannedRow = {
  id: string
  loadG: number
  targetReps: number | null
  targetSeconds: number | null
}

// The set stores the plan of its exercise, as the set route does (ADR-033).
function findPlanned(
  tx: Pick<Database, 'select'>,
  programDayId: string | undefined,
  exerciseId: string,
): PlannedRow | undefined {
  if (!programDayId) {
    return undefined
  }
  return tx
    .select({
      id: plannedExercises.id,
      loadG: plannedExercises.loadG,
      targetReps: plannedExercises.targetReps,
      targetSeconds: plannedExercises.targetSeconds,
    })
    .from(plannedExercises)
    .where(
      and(
        eq(plannedExercises.programDayId, programDayId),
        eq(plannedExercises.exerciseId, exerciseId),
      ),
    )
    .get()
}

function findPlannedId(
  tx: Pick<Database, 'select'>,
  programDayId: string | undefined,
  exerciseId: string,
): string | null {
  return findPlanned(tx, programDayId, exerciseId)?.id ?? null
}
