import type { Database } from '../../db/connection.js'
import { DomainError } from '../../errors/domain-error.js'
import { deleteWorkout, findWorkoutRow } from './workout.repository.js'
import { confirmationCodeOf, isPreviewRequest, staleConfirmation } from './workout-confirmation.js'
import { findWorkoutSnapshot } from './workout-history.service.js'
import type { RemoveWorkoutInput, WorkoutRemoval } from './workouts.schemas.js'

// Validation comes before the preview: the workout, then the code, then preview or removal.
export function removeWorkout(db: Database, input: RemoveWorkoutInput): WorkoutRemoval {
  return db.transaction(() => {
    const workoutId = input.workoutId ?? ''
    const snapshot = findWorkoutSnapshot(db, workoutId)
    if (!snapshot) {
      throw new DomainError('workout_not_found', 'treino não encontrado', 'not_found')
    }
    const code = confirmationCodeOf({ action: 'remove_workout', workoutId }, snapshot)
    if (isPreviewRequest(input.confirmationCode)) {
      return { applied: false, confirmationCode: code, workout: snapshot.workout }
    }
    if (input.confirmationCode?.trim() !== code) {
      throw staleConfirmation()
    }
    deleteWorkout(db, workoutId)
    return { applied: true, confirmationCode: null, workout: snapshot.workout }
  })
}

// The phone confirms on its own sheet, so the route removes at once, with no code (ADR-032).
export function deleteWorkoutById(db: Database, workoutId: string): void {
  db.transaction(() => {
    if (!findWorkoutRow(db, workoutId)) {
      throw new DomainError('workout_not_found', 'treino não encontrado', 'not_found')
    }
    deleteWorkout(db, workoutId)
  })
}
