import type { Database } from '../../db/connection.js'
import { DomainError } from '../../errors/domain-error.js'
import { parseUtcInstant } from './utc-instant.js'
import { findWorkoutRow, updateWorkoutFinish, type WorkoutRow } from './workout.repository.js'
import type { FinishWorkoutBody, Workout, WorkoutEndReason } from './workouts.schemas.js'

const END_REASONS: readonly string[] = ['completed', 'ended_early'] satisfies WorkoutEndReason[]

// The order follows decision 37: format, then existence, then a replay, then the time rule,
// and every refusal happens before the write of the transaction.
export function finishWorkout(db: Database, workoutId: string, input: FinishWorkoutBody): Workout {
  const endReason = parseEndReason(input.endReason)
  const finishedAt = parseInstant(input.finishedAt)
  return db.transaction(() => {
    const stored = findWorkoutRow(db, workoutId)
    if (!stored) {
      throw new DomainError('workout_not_found', 'treino não encontrado', 'not_found')
    }
    if (stored.finishedAt !== null) {
      if (stored.finishedAt !== finishedAt || stored.endReason !== endReason) {
        throw new DomainError(
          'workout_already_finished',
          'treino já encerrado com outros dados',
          'conflict',
        )
      }
      return toWorkout(stored)
    }
    if (finishedAt < stored.startedAt) {
      throw new DomainError(
        'workout_finished_before_start',
        'o fim do treino é anterior ao início',
        'invalid',
      )
    }
    updateWorkoutFinish(db, workoutId, { finishedAt, endReason })
    return toWorkout({ ...stored, finishedAt, endReason })
  })
}

function parseEndReason(value: string): WorkoutEndReason {
  if (!END_REASONS.includes(value)) {
    throw new DomainError('workout_end_reason_invalid', 'motivo do fim inválido', 'invalid')
  }
  return value as WorkoutEndReason
}

function parseInstant(value: string): string {
  const instant = parseUtcInstant(value)
  if (instant === undefined) {
    throw new DomainError('workout_finished_at_invalid', 'instante do fim inválido', 'invalid')
  }
  return instant
}

function toWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    programId: row.programId,
    letter: row.letter,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    endReason: row.endReason,
  }
}
