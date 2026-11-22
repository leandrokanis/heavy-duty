import { and, asc, eq, gte, inArray, lt } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import {
  exercises,
  programDays,
  programs,
  workoutSets,
  workoutSkips,
  workouts,
} from '../../db/schema.js'
import type { ExerciseSummary, HistorySet, WorkoutEndReason } from './workouts.schemas.js'

export type HistoryWorkoutRow = {
  id: string
  programId: string
  programName: string
  letter: string
  label: string | null
  startedAt: string
  finishedAt: string | null
  endReason: WorkoutEndReason | null
}

export type HistorySkipRow = { workoutId: string; exercise: ExerciseSummary }

export type HistorySetRow = HistorySet & { workoutId: string; exercise: ExerciseSummary }

function selectHistoryWorkouts(db: Database) {
  return db
    .select({
      id: workouts.id,
      programId: workouts.programId,
      programName: programs.name,
      letter: workouts.letter,
      label: programDays.label,
      startedAt: workouts.startedAt,
      finishedAt: workouts.finishedAt,
      endReason: workouts.endReason,
    })
    .from(workouts)
    .innerJoin(programs, eq(workouts.programId, programs.id))
    .leftJoin(programDays, eq(workouts.programDayId, programDays.id))
}

// Both bounds are UTC instants in the toISOString() form, so text order is time order.
export function listWorkoutRowsStartedBetween(
  db: Database,
  fromInstant: string,
  toInstant: string,
): HistoryWorkoutRow[] {
  return selectHistoryWorkouts(db)
    .where(and(gte(workouts.startedAt, fromInstant), lt(workouts.startedAt, toInstant)))
    .orderBy(asc(workouts.startedAt), asc(workouts.id))
    .all()
}

export function findHistoryWorkoutRow(
  db: Database,
  workoutId: string,
): HistoryWorkoutRow | undefined {
  return selectHistoryWorkouts(db).where(eq(workouts.id, workoutId)).get()
}

export function listSetsOfWorkouts(db: Database, workoutIds: string[]): HistorySetRow[] {
  return db
    .select({
      workoutId: workoutSets.workoutId,
      id: workoutSets.id,
      setNumber: workoutSets.setNumber,
      loadG: workoutSets.loadG,
      reps: workoutSets.reps,
      seconds: workoutSets.seconds,
      performedAt: workoutSets.performedAt,
      correctedAt: workoutSets.correctedAt,
      exercise: {
        id: exercises.id,
        slug: exercises.slug,
        name: exercises.name,
        kind: exercises.kind,
      },
    })
    .from(workoutSets)
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(inArray(workoutSets.workoutId, workoutIds))
    .orderBy(asc(workoutSets.performedAt), asc(workoutSets.setNumber), asc(workoutSets.id))
    .all()
}

export function listSkipsOfWorkouts(db: Database, workoutIds: string[]): HistorySkipRow[] {
  return db
    .select({
      workoutId: workoutSkips.workoutId,
      exercise: {
        id: exercises.id,
        slug: exercises.slug,
        name: exercises.name,
        kind: exercises.kind,
      },
    })
    .from(workoutSkips)
    .innerJoin(exercises, eq(workoutSkips.exerciseId, exercises.id))
    .where(inArray(workoutSkips.workoutId, workoutIds))
    .orderBy(asc(workoutSkips.skippedAt), asc(exercises.id))
    .all()
}
