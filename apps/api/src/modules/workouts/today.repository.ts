import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { exerciseMuscles, muscleGroups, muscles, workoutSets, workouts } from '../../db/schema.js'

export type ExerciseMuscleGroup = { slug: string; name: string }

// Primary muscles only, one entry per group, in catalog order.
export function listPrimaryGroupsByExercise(
  db: Database,
  exerciseIds: readonly string[],
): Map<string, ExerciseMuscleGroup[]> {
  const rows = db
    .selectDistinct({
      exerciseId: exerciseMuscles.exerciseId,
      slug: muscleGroups.slug,
      name: muscleGroups.name,
    })
    .from(exerciseMuscles)
    .innerJoin(muscles, eq(exerciseMuscles.muscleId, muscles.id))
    .innerJoin(muscleGroups, eq(muscles.muscleGroupId, muscleGroups.id))
    .where(
      and(
        eq(exerciseMuscles.role, 'primary'),
        inArray(exerciseMuscles.exerciseId, [...exerciseIds]),
      ),
    )
    .orderBy(asc(muscleGroups.position))
    .all()
  const groupsByExercise = new Map<string, ExerciseMuscleGroup[]>()
  for (const { exerciseId, slug, name } of rows) {
    groupsByExercise.set(exerciseId, [...(groupsByExercise.get(exerciseId) ?? []), { slug, name }])
  }
  return groupsByExercise
}

export function findLastLoadG(db: Database, exerciseId: string): number | undefined {
  return db
    .select({ loadG: workoutSets.loadG })
    .from(workoutSets)
    .where(eq(workoutSets.exerciseId, exerciseId))
    .orderBy(desc(workoutSets.performedAt), desc(workoutSets.setNumber), desc(workoutSets.id))
    .limit(1)
    .get()?.loadG
}

export function findLastWorkoutLetter(db: Database, programId: string): string | null {
  return (
    db
      .select({ letter: workouts.letter })
      .from(workouts)
      .where(eq(workouts.programId, programId))
      .orderBy(desc(workouts.startedAt), desc(workouts.id))
      .limit(1)
      .get()?.letter ?? null
  )
}
