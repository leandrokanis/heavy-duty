import { createHash } from 'node:crypto'
import { DomainError } from '../../errors/domain-error.js'
import type { WorkoutSnapshot } from './workout-history.service.js'

export type ConfirmationRequest =
  | { action: 'remove_workout'; workoutId: string }
  | {
      action: 'update_workout_set'
      workoutId: string
      setId: string
      loadG: number
      reps: number | null
      seconds: number | null
    }

// A missing, empty or blank code asks for the preview.
export function isPreviewRequest(code: string | undefined): boolean {
  return code === undefined || code.trim() === ''
}

// Not a secret: it only proves the request and the workout are the ones the preview showed.
export function confirmationCodeOf(
  request: ConfirmationRequest,
  snapshot: WorkoutSnapshot,
): string {
  const sets = snapshot.workout.exercises
    .flatMap(({ sets: exerciseSets }) => exerciseSets)
    .map(({ id, loadG, reps, seconds, correctedAt }) => ({ id, loadG, reps, seconds, correctedAt }))
    .sort((a, b) => (a.id < b.id ? -1 : 1))
  const { startedAt, finishedAt, endReason } = snapshot.workout
  const canonical = JSON.stringify({
    request,
    state: { startedAt, finishedAt, endReason, sets, skipped: snapshot.skippedExerciseIds },
  })
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32)
}

export function staleConfirmation(): DomainError {
  return new DomainError(
    'workout_confirmation_stale',
    'o treino mudou desde a prévia; peça uma nova prévia',
    'conflict',
  )
}
