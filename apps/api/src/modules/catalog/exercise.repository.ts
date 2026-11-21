import { asc, eq, inArray, isNull } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { exerciseMuscles, exercises, muscleGroups, muscles } from '../../db/schema.js'
import type { ExerciseKind, ExerciseMuscle } from './catalog.schemas.js'

export type ExerciseMuscleRole = ExerciseMuscle['role']

export type NewExercise = {
  id: string
  slug: string
  name: string
  kind: ExerciseKind
}

export type NewExerciseMuscle = {
  muscleId: string
  role: ExerciseMuscleRole
}

export type ExerciseRow = NewExercise

export type MuscleRow = Omit<ExerciseMuscle, 'role'> & { muscleGroupPosition: number }

export type ExerciseMuscleRow = MuscleRow & { exerciseId: string; role: ExerciseMuscleRole }

const muscleWithGroup = {
  id: muscles.id,
  slug: muscles.slug,
  name: muscles.name,
  muscleGroup: { id: muscleGroups.id, slug: muscleGroups.slug, name: muscleGroups.name },
  muscleGroupPosition: muscleGroups.position,
}

export function findMusclesBySlugs(db: Database, slugs: readonly string[]): MuscleRow[] {
  return db
    .select(muscleWithGroup)
    .from(muscles)
    .innerJoin(muscleGroups, eq(muscles.muscleGroupId, muscleGroups.id))
    .where(inArray(muscles.slug, [...slugs]))
    .all()
}

export function existsExerciseWithSlug(db: Database, slug: string): boolean {
  return (
    db.select({ id: exercises.id }).from(exercises).where(eq(exercises.slug, slug)).get() !==
    undefined
  )
}

export function listActiveExerciseRows(db: Database): ExerciseRow[] {
  return db
    .select({ id: exercises.id, slug: exercises.slug, name: exercises.name, kind: exercises.kind })
    .from(exercises)
    .where(isNull(exercises.archivedAt))
    .orderBy(asc(exercises.slug))
    .all()
}

export function listExerciseMuscleRows(
  db: Database,
  exerciseIds: readonly string[],
): ExerciseMuscleRow[] {
  return db
    .select({
      ...muscleWithGroup,
      exerciseId: exerciseMuscles.exerciseId,
      role: exerciseMuscles.role,
    })
    .from(exerciseMuscles)
    .innerJoin(muscles, eq(exerciseMuscles.muscleId, muscles.id))
    .innerJoin(muscleGroups, eq(muscles.muscleGroupId, muscleGroups.id))
    .where(inArray(exerciseMuscles.exerciseId, [...exerciseIds]))
    .all()
}

export function insertExerciseWithMuscles(
  db: Database,
  exercise: NewExercise,
  exerciseMuscleRows: readonly NewExerciseMuscle[],
): void {
  db.transaction((tx) => {
    tx.insert(exercises).values(exercise).run()
    tx.insert(exerciseMuscles)
      .values(exerciseMuscleRows.map((muscle) => ({ exerciseId: exercise.id, ...muscle })))
      .run()
  })
}
