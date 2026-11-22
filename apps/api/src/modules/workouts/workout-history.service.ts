import type { Database } from '../../db/connection.js'
import { MAX_WORKOUT_RANGE_DAYS, parseUtcRange } from './utc-range.js'
import {
  findHistoryWorkoutRow,
  type HistorySetRow,
  type HistorySkipRow,
  type HistoryWorkoutRow,
  listSetsOfWorkouts,
  listSkipsOfWorkouts,
  listWorkoutRowsStartedBetween,
} from './workout-history.repository.js'
import type {
  HistoryExercise,
  HistoryWorkout,
  ListWorkoutsQuery,
  WorkoutHistory,
} from './workouts.schemas.js'

export function listWorkouts(db: Database, query: ListWorkoutsQuery): WorkoutHistory {
  const { from, to } = parseUtcRange(query, MAX_WORKOUT_RANGE_DAYS)
  const rows = listWorkoutRowsStartedBetween(db, from, to)
  if (rows.length === 0) {
    return { workouts: [] }
  }
  const workoutIds = rows.map((row) => row.id)
  const sets = listSetsOfWorkouts(db, workoutIds)
  const skips = listSkipsOfWorkouts(db, workoutIds)
  return { workouts: rows.map((row) => toHistoryWorkout(row, sets, skips)) }
}

export type WorkoutSnapshot = { workout: HistoryWorkout; skippedExerciseIds: string[] }

// The history shape of one workout, plus every skipped exercise, even one that was done later.
export function findWorkoutSnapshot(db: Database, workoutId: string): WorkoutSnapshot | undefined {
  const row = findHistoryWorkoutRow(db, workoutId)
  if (!row) {
    return undefined
  }
  const sets = listSetsOfWorkouts(db, [workoutId])
  const skips = listSkipsOfWorkouts(db, [workoutId])
  return {
    workout: toHistoryWorkout(row, sets, skips),
    skippedExerciseIds: skips.map((skip) => skip.exercise.id).sort(),
  }
}

function toHistoryWorkout(
  row: HistoryWorkoutRow,
  allSets: HistorySetRow[],
  allSkips: HistorySkipRow[],
): HistoryWorkout {
  const sets = allSets.filter((set) => set.workoutId === row.id)
  const doneExerciseIds = new Set(sets.map((set) => set.exercise.id))
  return {
    id: row.id,
    program: { id: row.programId, name: row.programName },
    letter: row.letter,
    label: row.label,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    endReason: row.endReason,
    exercises: groupByExercise(sets),
    // A skipped exercise that was done later is not left out.
    leftOut: allSkips
      .filter((skip) => skip.workoutId === row.id && !doneExerciseIds.has(skip.exercise.id))
      .map((skip) => skip.exercise),
  }
}

// The sets come by time, so each exercise enters at its first set; inside it, by set number.
function groupByExercise(sets: HistorySetRow[]): HistoryExercise[] {
  const byExercise = new Map<string, HistoryExercise>()
  for (const { workoutId: _workoutId, exercise, ...set } of sets) {
    const entry = byExercise.get(exercise.id) ?? { exercise, sets: [] }
    entry.sets.push(set)
    byExercise.set(exercise.id, entry)
  }
  const grouped = [...byExercise.values()]
  for (const { sets: exerciseSets } of grouped) {
    exerciseSets.sort((a, b) => a.setNumber - b.setNumber)
  }
  return grouped
}
