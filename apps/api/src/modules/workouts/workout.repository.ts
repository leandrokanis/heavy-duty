import { and, eq } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { exercises, plannedExercises, workoutSets, workouts } from '../../db/schema.js'
import type { ExerciseKind } from '../catalog/catalog.schemas.js'
import type { WorkoutSet } from './workouts.schemas.js'

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

export type WorkoutRow = NewWorkout

export function findWorkoutRow(db: Database, workoutId: string): WorkoutRow | undefined {
  return db
    .select({
      id: workouts.id,
      programId: workouts.programId,
      programDayId: workouts.programDayId,
      letter: workouts.letter,
      startedAt: workouts.startedAt,
    })
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .get()
}

export function insertWorkout(db: Database, workout: NewWorkout): void {
  db.insert(workouts).values(workout).run()
}

export function findWorkoutSetRow(db: Database, setId: string): WorkoutSet | undefined {
  return db.select(workoutSetColumns).from(workoutSets).where(eq(workoutSets.id, setId)).get()
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

export function insertWorkoutSet(db: Database, set: WorkoutSet): void {
  db.insert(workoutSets).values(set).run()
}

export type PlannedExerciseTarget = {
  id: string
  programDayId: string
  exerciseId: string
  kind: ExerciseKind
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
    })
    .from(plannedExercises)
    .innerJoin(exercises, eq(plannedExercises.exerciseId, exercises.id))
    .where(eq(plannedExercises.id, plannedExerciseId))
    .get()
}
