import { and, eq } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import {
  exercises,
  plannedExercises,
  workoutSets,
  workoutSkips,
  workouts,
} from '../../db/schema.js'
import type { ExerciseKind } from '../catalog/catalog.schemas.js'
import { listPrimaryGroupsByExercise } from './today.repository.js'
import type { Workout, WorkoutEndReason, WorkoutSet, WorkoutSkip } from './workouts.schemas.js'

export type NewWorkout = {
  id: string
  programId: string
  programDayId: string | null
  letter: string
  startedAt: string
}

const workoutSetColumns = {
  id: workoutSets.id,
  workoutId: workoutSets.workoutId,
  exerciseId: workoutSets.exerciseId,
  plannedExerciseId: workoutSets.plannedExerciseId,
  setNumber: workoutSets.setNumber,
  loadG: workoutSets.loadG,
  reps: workoutSets.reps,
  seconds: workoutSets.seconds,
  performedAt: workoutSets.performedAt,
}

export type WorkoutRow = NewWorkout & {
  finishedAt: string | null
  endReason: WorkoutEndReason | null
}

export function findWorkoutRow(db: Database, workoutId: string): WorkoutRow | undefined {
  return db
    .select({
      id: workouts.id,
      programId: workouts.programId,
      programDayId: workouts.programDayId,
      letter: workouts.letter,
      startedAt: workouts.startedAt,
      finishedAt: workouts.finishedAt,
      endReason: workouts.endReason,
    })
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .get()
}

// Sets and skips go with it, by ON DELETE CASCADE.
export function deleteWorkout(db: Database, workoutId: string): void {
  db.delete(workouts).where(eq(workouts.id, workoutId)).run()
}

export function insertWorkout(db: Database, workout: NewWorkout): void {
  db.insert(workouts).values(workout).run()
}

export function updateWorkoutFinish(
  db: Database,
  workoutId: string,
  finish: Pick<Workout, 'finishedAt' | 'endReason'>,
): void {
  db.update(workouts).set(finish).where(eq(workouts.id, workoutId)).run()
}

export function findWorkoutSetRow(db: Database, setId: string): WorkoutSet | undefined {
  return db.select(workoutSetColumns).from(workoutSets).where(eq(workoutSets.id, setId)).get()
}

export function updateWorkoutSetValues(
  db: Database,
  setId: string,
  values: Pick<WorkoutSet, 'loadG' | 'reps' | 'seconds'> & { correctedAt?: string },
): void {
  db.update(workoutSets).set(values).where(eq(workoutSets.id, setId)).run()
}

export function existsWorkoutSet(
  db: Database,
  workoutId: string,
  exerciseId: string,
  setNumber: number,
): boolean {
  return (
    db
      .select({ id: workoutSets.id })
      .from(workoutSets)
      .where(
        and(
          eq(workoutSets.workoutId, workoutId),
          eq(workoutSets.exerciseId, exerciseId),
          eq(workoutSets.setNumber, setNumber),
        ),
      )
      .get() !== undefined
  )
}

// The plan of the moment of the record (ADR-033); the correction never changes it.
export type SetPlan = Pick<PlannedExerciseTarget, 'targetReps' | 'targetSeconds'> & {
  plannedLoadG: number
  plannedGroupSets: Record<string, number>
}

// The planned sets of each primary group of the exercise in the letter, by group slug (D54).
export function countPlannedGroupSets(
  db: Database,
  programDayId: string,
  exerciseId: string,
): Record<string, number> {
  const planned = db
    .select({ exerciseId: plannedExercises.exerciseId, sets: plannedExercises.sets })
    .from(plannedExercises)
    .where(eq(plannedExercises.programDayId, programDayId))
    .all()
  const groupsOf = listPrimaryGroupsByExercise(db, [
    exerciseId,
    ...planned.map((row) => row.exerciseId),
  ])
  const slugsOf = (id: string) => (groupsOf.get(id) ?? []).map(({ slug }) => slug)
  return Object.fromEntries(
    slugsOf(exerciseId).map((slug) => [
      slug,
      planned
        .filter((row) => slugsOf(row.exerciseId).includes(slug))
        .reduce((total, row) => total + row.sets, 0),
    ]),
  )
}

export function insertWorkoutSet(db: Database, set: WorkoutSet, plan: SetPlan): void {
  db.insert(workoutSets)
    .values({ ...set, ...plan })
    .run()
}

export function findExerciseKind(db: Database, exerciseId: string): ExerciseKind | undefined {
  return db
    .select({ kind: exercises.kind })
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .get()?.kind
}

export type PlannedExerciseTarget = {
  id: string
  programDayId: string
  exerciseId: string
  kind: ExerciseKind
  loadG: number
  targetReps: number | null
  targetSeconds: number | null
}

export function findPlannedExerciseTarget(
  db: Database,
  plannedExerciseId: string,
): PlannedExerciseTarget | undefined {
  return db
    .select({
      id: plannedExercises.id,
      programDayId: plannedExercises.programDayId,
      exerciseId: plannedExercises.exerciseId,
      kind: exercises.kind,
      loadG: plannedExercises.loadG,
      targetReps: plannedExercises.targetReps,
      targetSeconds: plannedExercises.targetSeconds,
    })
    .from(plannedExercises)
    .innerJoin(exercises, eq(plannedExercises.exerciseId, exercises.id))
    .where(eq(plannedExercises.id, plannedExerciseId))
    .get()
}

const workoutSkipColumns = {
  workoutId: workoutSkips.workoutId,
  exerciseId: workoutSkips.exerciseId,
  plannedExerciseId: workoutSkips.plannedExerciseId,
  skippedAt: workoutSkips.skippedAt,
}

export function findWorkoutSkipByPlanned(
  db: Database,
  workoutId: string,
  plannedExerciseId: string,
): WorkoutSkip | undefined {
  return db
    .select(workoutSkipColumns)
    .from(workoutSkips)
    .where(
      and(
        eq(workoutSkips.workoutId, workoutId),
        eq(workoutSkips.plannedExerciseId, plannedExerciseId),
      ),
    )
    .get()
}

export function findWorkoutSkipByExercise(
  db: Database,
  workoutId: string,
  exerciseId: string,
): WorkoutSkip | undefined {
  return db
    .select(workoutSkipColumns)
    .from(workoutSkips)
    .where(and(eq(workoutSkips.workoutId, workoutId), eq(workoutSkips.exerciseId, exerciseId)))
    .get()
}

export function insertWorkoutSkip(db: Database, skip: WorkoutSkip): void {
  db.insert(workoutSkips).values(skip).run()
}
