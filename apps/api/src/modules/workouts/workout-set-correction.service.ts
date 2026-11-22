import type { Database } from '../../db/connection.js'
import { DomainError } from '../../errors/domain-error.js'
import {
  findExerciseKind,
  findWorkoutRow,
  findWorkoutSetRow,
  updateWorkoutSetValues,
} from './workout.repository.js'
import { parseMeasuredValues, parseMeasureOfKind } from './workout-set.service.js'
import type { CorrectWorkoutSetBody, WorkoutSet } from './workouts.schemas.js'

// Replaces the load and the measure of a stored set; the rest of the row never changes,
// except corrected_at, which marks the arrival of a correction that changed a value.
export function correctWorkoutSet(
  db: Database,
  workoutId: string,
  setId: string,
  input: CorrectWorkoutSetBody,
  now: () => Date,
): WorkoutSet {
  return db.transaction(() => {
    if (!findWorkoutRow(db, workoutId)) {
      throw new DomainError('workout_not_found', 'treino não encontrado', 'not_found')
    }
    const stored = findWorkoutSetRow(db, setId)
    if (!stored || stored.workoutId !== workoutId) {
      throw new DomainError('workout_set_not_found', 'série não encontrada', 'not_found')
    }
    parseMeasuredValues(input)
    const kind = findExerciseKind(db, stored.exerciseId)
    if (kind) {
      parseMeasureOfKind(kind, input)
    }
    const values = { loadG: input.loadG, reps: input.reps ?? null, seconds: input.seconds ?? null }
    const changed =
      values.loadG !== stored.loadG ||
      values.reps !== stored.reps ||
      values.seconds !== stored.seconds
    updateWorkoutSetValues(
      db,
      setId,
      changed ? { ...values, correctedAt: now().toISOString() } : values,
    )
    return { ...stored, ...values }
  })
}
