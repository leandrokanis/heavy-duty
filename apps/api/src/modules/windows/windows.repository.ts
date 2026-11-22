import { and, asc, eq, gte, inArray, lt } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { exerciseMuscles, muscleGroups, muscles, workoutSets } from '../../db/schema.js'
import type { VolumeSet } from './volume.rules.js'

export type PerformedSet = VolumeSet & { performedAt: string }

export type MuscleGroupRow = { slug: string; name: string }

export function listMuscleGroups(db: Database): MuscleGroupRow[] {
  return db
    .select({ slug: muscleGroups.slug, name: muscleGroups.name })
    .from(muscleGroups)
    .orderBy(asc(muscleGroups.position))
    .all()
}

// Both bounds are UTC instants in the toISOString() form, so text order is time order.
export function listSetsPerformedBetween(
  db: Database,
  fromInstant: string,
  toInstant: string,
): PerformedSet[] {
  const sets = db
    .select({
      performedAt: workoutSets.performedAt,
      loadG: workoutSets.loadG,
      reps: workoutSets.reps,
      seconds: workoutSets.seconds,
      exerciseId: workoutSets.exerciseId,
    })
    .from(workoutSets)
    .where(and(gte(workoutSets.performedAt, fromInstant), lt(workoutSets.performedAt, toInstant)))
    .all()
  if (sets.length === 0) {
    return []
  }
  const exerciseIds = [...new Set(sets.map((set) => set.exerciseId))]
  const groupsOfExercise = new Map<string, { primary: string[]; secondary: string[] }>()
  const rows = db
    .select({
      exerciseId: exerciseMuscles.exerciseId,
      role: exerciseMuscles.role,
      groupSlug: muscleGroups.slug,
    })
    .from(exerciseMuscles)
    .innerJoin(muscles, eq(exerciseMuscles.muscleId, muscles.id))
    .innerJoin(muscleGroups, eq(muscles.muscleGroupId, muscleGroups.id))
    .where(inArray(exerciseMuscles.exerciseId, exerciseIds))
    .all()
  for (const row of rows) {
    const entry = groupsOfExercise.get(row.exerciseId) ?? { primary: [], secondary: [] }
    entry[row.role].push(row.groupSlug)
    groupsOfExercise.set(row.exerciseId, entry)
  }
  return sets.map(({ exerciseId, ...set }) => ({
    ...set,
    primaryGroupSlugs: groupsOfExercise.get(exerciseId)?.primary ?? [],
    secondaryGroupSlugs: groupsOfExercise.get(exerciseId)?.secondary ?? [],
  }))
}
