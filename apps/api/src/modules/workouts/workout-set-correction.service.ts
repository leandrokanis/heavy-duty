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

export type SetValues = Pick<WorkoutSet, 'loadG' | 'reps' | 'seconds'>

export type CheckedSetCorrection = { stored: WorkoutSet; values: SetValues }

// Refuses a missing workout, a set of another workout and a value or measure that does not
// fit the exercise; shared by the correction and by the edit of the planner.
export function checkSetCorrection(
  db: Database,
  workoutId: string,
  setId: string,
  input: Partial<CorrectWorkoutSetBody>,
): CheckedSetCorrection {
  if (!findWorkoutRow(db, workoutId)) {
    throw new DomainError('workout_not_found', 'treino não encontrado', 'not_found')
  }
  const stored = findWorkoutSetRow(db, setId)
  if (!stored || stored.workoutId !== workoutId) {
    throw new DomainError('workout_set_not_found', 'série não encontrada', 'not_found')
  }
  const { loadG } = input
  if (loadG === undefined) {
    throw new DomainError('workout_set_load_invalid', 'carga inválida', 'invalid')
  }
  parseMeasuredValues({ ...input, loadG })
  const kind = findExerciseKind(db, stored.exerciseId)
  if (kind) {
    parseMeasureOfKind(kind, { ...input, loadG })
  }
  return {
    stored,
    values: { loadG, reps: input.reps ?? null, seconds: input.seconds ?? null },
  }
}

// The rest of the row never changes, except corrected_at, which marks the arrival of a
// correction that changed a value.
export function writeSetCorrection(
  db: Database,
  { stored, values }: CheckedSetCorrection,
  now: () => Date,
): WorkoutSet {
  const changed =
    values.loadG !== stored.loadG ||
    values.reps !== stored.reps ||
    values.seconds !== stored.seconds
  updateWorkoutSetValues(
    db,
    stored.id,
    changed ? { ...values, correctedAt: now().toISOString() } : values,
  )
  return { ...stored, ...values }
}

export function correctWorkoutSet(
  db: Database,
  workoutId: string,
  setId: string,
  input: CorrectWorkoutSetBody,
  now: () => Date,
): WorkoutSet {
  return db.transaction(() =>
    writeSetCorrection(db, checkSetCorrection(db, workoutId, setId, input), now),
  )
}
