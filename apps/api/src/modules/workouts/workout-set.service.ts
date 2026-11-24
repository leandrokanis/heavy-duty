import type { Database } from '../../db/connection.js'
import { DomainError } from '../../errors/domain-error.js'
import type { ExerciseKind } from '../catalog/catalog.schemas.js'
import { findProgramDayRow, findProgramRow } from '../programs/program.repository.js'
import {
  existsWorkoutSet,
  findPlannedExerciseTarget,
  findWorkoutRow,
  findWorkoutSetRow,
  insertWorkout,
  insertWorkoutSet,
  type PlannedExerciseTarget,
  type WorkoutRow,
} from './workout.repository.js'
import type { RecordWorkoutSetBody, WorkoutSet } from './workouts.schemas.js'

export type RecordedWorkoutSet = { set: WorkoutSet; created: boolean }

type WorkoutData = Pick<WorkoutRow, 'programId' | 'letter' | 'startedAt'>

// The order follows decision 30: a replay answers before the plan is read, and
// every refusal happens before the first write of the transaction.
export function recordWorkoutSet(
  db: Database,
  workoutId: string,
  input: RecordWorkoutSetBody,
): RecordedWorkoutSet {
  return db.transaction(() => {
    const workout: WorkoutData = {
      programId: input.workout.programId,
      letter: input.workout.letter.toUpperCase(),
      startedAt: toUtcIso(input.workout.startedAt),
    }
    const existingWorkout = findWorkoutRow(db, workoutId)
    if (existingWorkout && !isSameWorkout(existingWorkout, workout)) {
      throw new DomainError('workout_conflict', 'treino já registrado com outros dados', 'conflict')
    }
    const stored = findWorkoutSetRow(db, input.id)
    if (stored) {
      if (!isSameSet(stored, workoutId, input)) {
        throw new DomainError(
          'workout_set_id_conflict',
          'série já registrada com outros valores',
          'conflict',
        )
      }
      return { set: stored, created: false }
    }
    parseLetter(input.workout.letter)
    parseValues(input)
    const programDayId = requireProgramDayId(db, workout)
    const planned = requirePlannedExercise(db, programDayId, input.plannedExerciseId)
    parseExercise(planned, input)
    if (!existingWorkout) {
      insertWorkout(db, { id: workoutId, programDayId, ...workout })
    }
    if (existsWorkoutSet(db, workoutId, input.exerciseId, input.setNumber)) {
      throw new DomainError(
        'workout_set_duplicated',
        'série já registrada neste treino',
        'conflict',
      )
    }
    const set: WorkoutSet = {
      id: input.id,
      workoutId,
      exerciseId: input.exerciseId,
      plannedExerciseId: input.plannedExerciseId,
      setNumber: input.setNumber,
      loadG: input.loadG,
      reps: input.reps ?? null,
      seconds: input.seconds ?? null,
      performedAt: toUtcIso(input.performedAt),
    }
    insertWorkoutSet(db, set, {
      plannedLoadG: planned.loadG,
      targetReps: planned.targetReps,
      targetSeconds: planned.targetSeconds,
    })
    return { set, created: true }
  })
}

function isSameWorkout(stored: WorkoutRow, workout: WorkoutData): boolean {
  return (
    stored.programId === workout.programId &&
    stored.letter === workout.letter &&
    stored.startedAt === workout.startedAt
  )
}

// performedAt and plannedExerciseId stay out: the link turns null when the plan changes (decision 29).
function isSameSet(stored: WorkoutSet, workoutId: string, input: RecordWorkoutSetBody): boolean {
  return (
    stored.workoutId === workoutId &&
    stored.exerciseId === input.exerciseId &&
    stored.setNumber === input.setNumber &&
    stored.loadG === input.loadG &&
    stored.reps === (input.reps ?? null) &&
    stored.seconds === (input.seconds ?? null)
  )
}

// Checked before upper-casing: 'ı'.toUpperCase() is 'I', so a later check would accept it.
const ASCII_LETTER = /^[A-Za-z]$/

function parseLetter(letter: string): void {
  if (!ASCII_LETTER.test(letter)) {
    throw new DomainError('program_day_letter_invalid', 'a letra deve ser de A a Z', 'invalid')
  }
}

const MEASURE_INVALID: [code: string, message: string] = [
  'workout_set_measure_invalid',
  'informe repetições no exercício de repetição e segundos no exercício de tempo',
]

export type MeasuredValues = { loadG: number; reps?: number; seconds?: number }

// Shared by the record and the correction, so both refuse a value with the same code.
export function parseMeasuredValues(values: MeasuredValues): void {
  if (values.loadG < 0) {
    throw new DomainError('workout_set_load_invalid', 'carga inválida', 'invalid')
  }
  if ((values.reps === undefined) === (values.seconds === undefined)) {
    throw new DomainError(...MEASURE_INVALID, 'invalid')
  }
  if (values.reps !== undefined && values.reps < 1) {
    throw new DomainError('workout_set_reps_invalid', 'repetições inválidas', 'invalid')
  }
  if (values.seconds !== undefined && values.seconds < 1) {
    throw new DomainError('workout_set_seconds_invalid', 'tempo inválido', 'invalid')
  }
}

export function parseMeasureOfKind(kind: ExerciseKind, values: MeasuredValues): void {
  const measure = kind === 'reps' ? values.reps : values.seconds
  if (measure === undefined) {
    throw new DomainError(...MEASURE_INVALID, 'invalid')
  }
}

function parseValues(input: RecordWorkoutSetBody): void {
  parseMeasuredValues(input)
  if (input.setNumber < 1) {
    throw new DomainError('workout_set_number_invalid', 'número da série inválido', 'invalid')
  }
}

// Program and letter come in the body, so a missing one is a missing reference (422).
function requireProgramDayId(db: Database, workout: WorkoutData): string {
  if (!findProgramRow(db, workout.programId)) {
    throw new DomainError('program_not_found', 'programa não encontrado', 'not_found_reference')
  }
  const day = findProgramDayRow(db, workout.programId, workout.letter)
  if (!day) {
    throw new DomainError(
      'program_day_not_found',
      'letra não encontrada no programa',
      'not_found_reference',
    )
  }
  return day.id
}

function requirePlannedExercise(
  db: Database,
  programDayId: string,
  plannedExerciseId: string,
): PlannedExerciseTarget {
  const planned = findPlannedExerciseTarget(db, plannedExerciseId)
  if (!planned || planned.programDayId !== programDayId) {
    throw new DomainError(
      'planned_exercise_not_found',
      'exercício não encontrado na letra',
      'not_found_reference',
    )
  }
  return planned
}

function parseExercise(planned: PlannedExerciseTarget, input: RecordWorkoutSetBody): void {
  if (planned.exerciseId !== input.exerciseId) {
    throw new DomainError(
      'workout_set_exercise_mismatch',
      'exercício diferente do exercício do programa',
      'invalid',
    )
  }
  parseMeasureOfKind(planned.kind, input)
}

// The schema already accepts only UTC ISO 8601; this unifies the precision.
function toUtcIso(value: string): string {
  return new Date(value).toISOString()
}
