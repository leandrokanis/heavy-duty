import { and, asc, eq, gte, inArray, lt } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import {
  exerciseMuscles,
  muscleGroups,
  muscles,
  programs,
  workoutSets,
  workouts,
} from '../../db/schema.js'
import type { VolumeSet } from './volume.rules.js'
import type { Goal } from './windows.config.js'

export type PerformedSet = VolumeSet & { performedAt: string }

export type WorkoutPerformedSet = PerformedSet & {
  workoutId: string
  exerciseId: string
  letter: string
  goal: Goal
}

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
  return withGroups(db, sets)
}

export type ProgressSetRow = WorkoutPerformedSet & {
  plannedLoadG: number | null
  targetReps: number | null
  targetSeconds: number | null
  plannedGroupSets: Record<string, number> | null
}

// The sets with the plan frozen in each one (ADR-033), for the replay of the levels.
export function listProgressSets(db: Database): ProgressSetRow[] {
  const sets = db
    .select({
      performedAt: workoutSets.performedAt,
      loadG: workoutSets.loadG,
      reps: workoutSets.reps,
      seconds: workoutSets.seconds,
      exerciseId: workoutSets.exerciseId,
      workoutId: workouts.id,
      letter: workouts.letter,
      goal: programs.goal,
      plannedLoadG: workoutSets.plannedLoadG,
      targetReps: workoutSets.targetReps,
      targetSeconds: workoutSets.targetSeconds,
      plannedGroupSets: workoutSets.plannedGroupSets,
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .innerJoin(programs, eq(workouts.programId, programs.id))
    .all()
  return withGroups(db, sets)
}

// The goal is the current one of the program of the workout, so a goal change recalculates the past.
export function listWorkoutSets(db: Database): WorkoutPerformedSet[] {
  const sets = db
    .select({
      performedAt: workoutSets.performedAt,
      loadG: workoutSets.loadG,
      reps: workoutSets.reps,
      seconds: workoutSets.seconds,
      exerciseId: workoutSets.exerciseId,
      workoutId: workouts.id,
      letter: workouts.letter,
      goal: programs.goal,
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .innerJoin(programs, eq(workouts.programId, programs.id))
    .all()
  return withGroups(db, sets)
}

function withGroups<T extends { exerciseId: string }>(
  db: Database,
  sets: T[],
): (T & Pick<VolumeSet, 'primaryGroupSlugs' | 'secondaryGroupSlugs'>)[] {
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
  return sets.map((set) => ({
    ...set,
    primaryGroupSlugs: groupsOfExercise.get(set.exerciseId)?.primary ?? [],
    secondaryGroupSlugs: groupsOfExercise.get(set.exerciseId)?.secondary ?? [],
  }))
}
