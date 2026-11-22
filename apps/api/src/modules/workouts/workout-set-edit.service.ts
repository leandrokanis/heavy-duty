import type { Database } from '../../db/connection.js'
import { DomainError } from '../../errors/domain-error.js'
import { confirmationCodeOf, isPreviewRequest, staleConfirmation } from './workout-confirmation.js'
import { findWorkoutSnapshot } from './workout-history.service.js'
import { checkSetCorrection, writeSetCorrection } from './workout-set-correction.service.js'
import type { EditWorkoutSetInput, WorkoutSetEdit } from './workouts.schemas.js'

// Validation comes before the preview: workout, set, values and kind, then code, then preview or write.
export function editWorkoutSet(
  db: Database,
  input: EditWorkoutSetInput,
  now: () => Date,
): WorkoutSetEdit {
  return db.transaction(() => {
    const workoutId = input.workoutId ?? ''
    const setId = input.setId ?? ''
    const snapshot = findWorkoutSnapshot(db, workoutId)
    if (!snapshot) {
      throw new DomainError('workout_not_found', 'treino não encontrado', 'not_found')
    }
    const { stored, values } = checkSetCorrection(db, workoutId, setId, {
      loadG: input.loadG,
      reps: input.reps,
      seconds: input.seconds,
    })
    const exercise = snapshot.workout.exercises.find(
      (entry) => entry.exercise.id === stored.exerciseId,
    )
    if (!exercise) {
      throw new DomainError('workout_set_not_found', 'série não encontrada', 'not_found')
    }
    const code = confirmationCodeOf(
      { action: 'update_workout_set', workoutId, setId, ...values },
      snapshot,
    )
    const preview = isPreviewRequest(input.confirmationCode)
    if (!preview && input.confirmationCode?.trim() !== code) {
      throw staleConfirmation()
    }
    if (!preview) {
      writeSetCorrection(db, { stored, values }, now)
    }
    return {
      applied: !preview,
      confirmationCode: preview ? code : null,
      workout: {
        id: workoutId,
        letter: snapshot.workout.letter,
        startedAt: snapshot.workout.startedAt,
      },
      exercise: exercise.exercise,
      set: { id: setId, setNumber: stored.setNumber },
      before: { loadG: stored.loadG, reps: stored.reps, seconds: stored.seconds },
      after: values,
    }
  })
}
