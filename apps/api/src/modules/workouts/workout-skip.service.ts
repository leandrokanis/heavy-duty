import type { Database } from '../../db/connection.js'
import { DomainError } from '../../errors/domain-error.js'
import {
  findPlannedExerciseTarget,
  findWorkoutRow,
  findWorkoutSkipByExercise,
  findWorkoutSkipByPlanned,
  insertWorkoutSkip,
  type PlannedExerciseTarget,
  type WorkoutRow,
} from './workout.repository.js'
import type { RecordWorkoutSkipBody, WorkoutSkip } from './workouts.schemas.js'

export type RecordedWorkoutSkip = { skip: WorkoutSkip; created: boolean }

// Same UTC ISO 8601 shape the set route accepts, with optional milliseconds.
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/

// The order follows decision 31: format, then existence, then a replay (before the plan is
// read), then the plan, the time rule and the exercise already skipped; every refusal
// happens before the write of the transaction.
export function recordWorkoutSkip(
  db: Database,
  workoutId: string,
  input: RecordWorkoutSkipBody,
): RecordedWorkoutSkip {
  const skippedAt = parseInstant(input.skippedAt)
  return db.transaction(() => {
    const workout = findWorkoutRow(db, workoutId)
    if (!workout) {
      throw new DomainError('workout_not_found', 'treino não encontrado', 'not_found')
    }
    const stored = findWorkoutSkipByPlanned(db, workoutId, input.plannedExerciseId)
    if (stored) {
      if (stored.skippedAt !== skippedAt) {
        throw skipConflict('exercício já pulado neste treino com outro instante')
      }
      return { skip: stored, created: false }
    }
    const planned = requirePlannedExercise(db, workout, input.plannedExerciseId)
    if (skippedAt < workout.startedAt) {
      throw new DomainError(
        'workout_skipped_before_start',
        'o pulo é anterior ao início do treino',
        'invalid',
      )
    }
    if (findWorkoutSkipByExercise(db, workoutId, planned.exerciseId)) {
      throw skipConflict('exercício já pulado neste treino')
    }
    const skip: WorkoutSkip = {
      workoutId,
      exerciseId: planned.exerciseId,
      plannedExerciseId: planned.id,
      skippedAt,
    }
    insertWorkoutSkip(db, skip)
    return { skip, created: true }
  })
}

function skipConflict(message: string): DomainError {
  return new DomainError('workout_skip_conflict', message, 'conflict')
}

function parseInstant(value: string): string {
  const time = UTC_INSTANT.test(value) ? new Date(value).getTime() : Number.NaN
  if (Number.isNaN(time)) {
    throw new DomainError('workout_skipped_at_invalid', 'instante do pulo inválido', 'invalid')
  }
  return new Date(time).toISOString()
}

// The workout keeps the day it was started on, so a planned exercise of another letter,
// or a workout whose day was removed, is a missing reference (422).
function requirePlannedExercise(
  db: Database,
  workout: WorkoutRow,
  plannedExerciseId: string,
): PlannedExerciseTarget {
  const planned = findPlannedExerciseTarget(db, plannedExerciseId)
  if (!planned || planned.programDayId !== workout.programDayId) {
    throw new DomainError(
      'planned_exercise_not_found',
      'exercício não encontrado na letra',
      'not_found_reference',
    )
  }
  return planned
}
