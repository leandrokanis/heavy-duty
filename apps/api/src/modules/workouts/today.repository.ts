import { and, asc, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { exerciseMuscles, muscleGroups, muscles, workoutSets, workouts } from '../../db/schema.js'

export type ExerciseMuscleGroup = { slug: string; name: string }

// One entry per group, in catalog order, for the muscles of one role.
function listGroupsByExercise(
  db: Database,
  exerciseIds: readonly string[],
  role: 'primary' | 'secondary',
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
      and(eq(exerciseMuscles.role, role), inArray(exerciseMuscles.exerciseId, [...exerciseIds])),
    )
    .orderBy(asc(muscleGroups.position))
    .all()
  const groupsByExercise = new Map<string, ExerciseMuscleGroup[]>()
  for (const { exerciseId, slug, name } of rows) {
    groupsByExercise.set(exerciseId, [...(groupsByExercise.get(exerciseId) ?? []), { slug, name }])
  }
  return groupsByExercise
}

// Primary muscles only, one entry per group, in catalog order.
export function listPrimaryGroupsByExercise(
  db: Database,
  exerciseIds: readonly string[],
): Map<string, ExerciseMuscleGroup[]> {
  return listGroupsByExercise(db, exerciseIds, 'primary')
}

// The groups of the secondary muscles that no primary muscle covers, as the volume counts them.
export function listSecondaryGroupsByExercise(
  db: Database,
  exerciseIds: readonly string[],
): Map<string, ExerciseMuscleGroup[]> {
  const primary = listPrimaryGroupsByExercise(db, exerciseIds)
  const secondary = listGroupsByExercise(db, exerciseIds, 'secondary')
  return new Map(
    [...secondary].map(([exerciseId, groups]) => {
      const primarySlugs = new Set((primary.get(exerciseId) ?? []).map(({ slug }) => slug))
      return [exerciseId, groups.filter(({ slug }) => !primarySlugs.has(slug))]
    }),
  )
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

export type ExerciseRepsSet = { exerciseId: string; loadG: number; reps: number }

// The sets with reps of the exercises, in any workout, program and letter: the input of the
// personal records (D59). Timed sets stay out.
export function listRepsSetsByExercise(
  db: Database,
  exerciseIds: readonly string[],
): Map<string, ExerciseRepsSet[]> {
  const rows = db
    .select({
      exerciseId: workoutSets.exerciseId,
      loadG: workoutSets.loadG,
      reps: workoutSets.reps,
    })
    .from(workoutSets)
    .where(and(inArray(workoutSets.exerciseId, [...exerciseIds]), isNotNull(workoutSets.reps)))
    .all()
  const setsByExercise = new Map<string, ExerciseRepsSet[]>()
  for (const row of rows) {
    const set = { ...row, reps: row.reps as number }
    setsByExercise.set(row.exerciseId, [...(setsByExercise.get(row.exerciseId) ?? []), set])
  }
  return setsByExercise
}
