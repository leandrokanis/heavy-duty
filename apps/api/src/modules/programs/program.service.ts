import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { DomainError } from '../../errors/domain-error.js'
import {
  type ExerciseRow,
  existsPlannedExercise,
  findActiveExerciseBySlug,
  findProgramDayRow,
  findProgramRow,
  insertActiveProgram,
  insertPlannedExercise,
  insertProgramDay,
  listPlannedExerciseRows,
  listProgramDayRows,
  listProgramRows,
  type ProgramRow,
} from './program.repository.js'
import {
  type AddPlannedExerciseInput,
  type AddProgramDayInput,
  type CreateProgramInput,
  GoalSchema,
  type Program,
} from './programs.schemas.js'

export function createProgram(db: Database, input: CreateProgramInput, now: Date): Program {
  return db.transaction(() => {
    const name = (input.name ?? '').trim()
    if (!name) {
      throw new DomainError('program_name_required', 'informe o nome do programa', 'invalid')
    }
    if (input.goal === undefined || input.goal === '') {
      throw new DomainError('program_goal_required', 'informe o objetivo do programa', 'invalid')
    }
    const goal = GoalSchema.safeParse(input.goal)
    if (!goal.success) {
      throw new DomainError('program_goal_invalid', 'objetivo inválido', 'invalid')
    }
    const id = createId(now.getTime())
    insertActiveProgram(db, { id, name, goal: goal.data, createdAt: now.toISOString() })
    return getProgram(db, id)
  })
}

export function addProgramDay(
  db: Database,
  programId: string,
  input: AddProgramDayInput,
  now: Date,
): Program {
  return db.transaction(() => {
    const letter = parseLetter(input.letter)
    const program = requireProgram(db, programId)
    if (findProgramDayRow(db, program.id, letter)) {
      throw new DomainError(
        'program_day_letter_duplicated',
        'letra já existe no programa',
        'conflict',
      )
    }
    insertProgramDay(db, {
      id: createId(now.getTime()),
      programId: program.id,
      letter,
      label: input.label?.trim() || null,
    })
    return getProgram(db, program.id)
  })
}

export function addPlannedExercise(
  db: Database,
  programId: string,
  letterParam: string,
  input: AddPlannedExerciseInput,
  now: Date,
): Program {
  return db.transaction(() => {
    const letter = parseLetter(letterParam)
    if (!input.exerciseSlug) {
      throw new DomainError('planned_exercise_exercise_required', 'informe o exercício', 'invalid')
    }
    if (!isCount(input.sets)) {
      throw new DomainError(
        'planned_exercise_sets_invalid',
        'informe as séries, a partir de 1',
        'invalid',
      )
    }
    const loadG = requireMeasure(input.loadG, LOAD_ERRORS)
    const restSeconds = requireMeasure(input.restSeconds, REST_ERRORS)
    const program = requireProgram(db, programId)
    const day = findProgramDayRow(db, program.id, letter)
    if (!day) {
      throw new DomainError(
        'program_day_not_found',
        'letra não encontrada no programa',
        'not_found',
      )
    }
    const exercise = findActiveExerciseBySlug(db, input.exerciseSlug)
    if (!exercise) {
      throw new DomainError('exercise_not_found', 'exercício não encontrado', 'not_found_reference')
    }
    const target = parseTarget(exercise, input)
    if (existsPlannedExercise(db, day.id, exercise.id)) {
      throw new DomainError('planned_exercise_duplicated', 'exercício já está na letra', 'conflict')
    }
    insertPlannedExercise(db, {
      id: createId(now.getTime()),
      programDayId: day.id,
      exerciseId: exercise.id,
      sets: input.sets,
      targetReps: exercise.kind === 'reps' ? target : null,
      targetSeconds: exercise.kind === 'time' ? target : null,
      loadG,
      restSeconds,
    })
    return getProgram(db, program.id)
  })
}

type MeasureErrors = {
  required: [code: string, message: string]
  invalid: [code: string, message: string]
}

const LOAD_ERRORS: MeasureErrors = {
  required: ['planned_exercise_load_required', 'informe a carga'],
  invalid: ['planned_exercise_load_invalid', 'carga inválida'],
}

const REST_ERRORS: MeasureErrors = {
  required: ['planned_exercise_rest_required', 'informe o descanso'],
  invalid: ['planned_exercise_rest_invalid', 'descanso inválido'],
}

// Safe integers only: above 2^53 a JSON number is already rounded, see FR-010.
function isCount(value: number | null | undefined): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1
}

function requireMeasure(value: number | undefined, errors: MeasureErrors): number {
  if (value === undefined) {
    throw new DomainError(...errors.required, 'invalid')
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError(...errors.invalid, 'invalid')
  }
  return value
}

function parseTarget(exercise: ExerciseRow, input: AddPlannedExerciseInput): number {
  if (exercise.kind === 'time' && input.targetReps != null) {
    throw new DomainError(
      'planned_exercise_target_time',
      'este exercício é medido por tempo',
      'invalid',
    )
  }
  if (exercise.kind === 'reps' && input.targetSeconds != null) {
    throw new DomainError(
      'planned_exercise_target_reps',
      'este exercício é medido por repetições',
      'invalid',
    )
  }
  const target = exercise.kind === 'reps' ? input.targetReps : input.targetSeconds
  if (target == null) {
    throw new DomainError('planned_exercise_target_required', 'informe o alvo da série', 'invalid')
  }
  if (!isCount(target)) {
    throw new DomainError('planned_exercise_target_invalid', 'alvo inválido', 'invalid')
  }
  return target
}

export function getProgram(db: Database, programId: string): Program {
  const [program] = toPrograms(db, [requireProgram(db, programId)])
  return program as Program
}

export function listPrograms(db: Database): { programs: Program[] } {
  return { programs: toPrograms(db, listProgramRows(db)) }
}

// Checked before upper-casing: 'ı'.toUpperCase() is 'I', so a later check would accept it.
const ASCII_LETTER = /^[A-Za-z]$/

function parseLetter(letter: string | undefined): string {
  if (!letter) {
    throw new DomainError('program_day_letter_required', 'informe a letra', 'invalid')
  }
  if (!ASCII_LETTER.test(letter)) {
    throw new DomainError('program_day_letter_invalid', 'a letra deve ser de A a Z', 'invalid')
  }
  return letter.toUpperCase()
}

function requireProgram(db: Database, programId: string): ProgramRow {
  const program = findProgramRow(db, programId)
  if (!program) {
    throw new DomainError('program_not_found', 'programa não encontrado', 'not_found')
  }
  return program
}

function toPrograms(db: Database, programRows: readonly ProgramRow[]): Program[] {
  const dayRows = listProgramDayRows(
    db,
    programRows.map((program) => program.id),
  )
  const plannedRows = listPlannedExerciseRows(
    db,
    dayRows.map((day) => day.id),
  )
  return programRows.map((program) => ({
    ...program,
    days: dayRows
      .filter((day) => day.programId === program.id)
      .map((day) => ({
        letter: day.letter,
        label: day.label,
        exercises: plannedRows
          .filter((planned) => planned.programDayId === day.id)
          .map(({ programDayId: _programDayId, ...planned }) => planned),
      })),
  }))
}
