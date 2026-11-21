import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { DomainError } from '../../errors/domain-error.js'
import {
  deletePlannedExercise,
  deleteProgramDay,
  type ExerciseRow,
  existsPlannedExercise,
  findActiveExerciseBySlug,
  findPlannedExerciseRow,
  findProgramDayRow,
  findProgramRow,
  insertActiveProgram,
  insertPlannedExercise,
  insertProgramDay,
  listPlannedExerciseRows,
  listProgramDayRows,
  listProgramRows,
  markProgramActive,
  type PlannedExerciseChanges,
  type PlannedExerciseRef,
  type ProgramDayRow,
  type ProgramRow,
  updatePlannedExerciseRow,
  updateProgramDayLabel,
  updateProgramRow,
} from './program.repository.js'
import {
  type AddPlannedExerciseInput,
  type AddProgramDayInput,
  type CreateProgramInput,
  type Goal,
  GoalSchema,
  type Program,
  type UpdatePlannedExerciseInput,
  type UpdateProgramDayInput,
  type UpdateProgramInput,
} from './programs.schemas.js'

export function createProgram(db: Database, input: CreateProgramInput, now: Date): Program {
  return db.transaction(() => {
    const name = parseProgramName(input.name)
    const goal = parseGoal(input.goal)
    const id = createId(now.getTime())
    insertActiveProgram(db, { id, name, goal, createdAt: now.toISOString() })
    return getProgram(db, id)
  })
}

export function updateProgram(db: Database, programId: string, input: UpdateProgramInput): Program {
  return db.transaction(() => {
    const changes: Partial<Pick<ProgramRow, 'name' | 'goal'>> = {}
    if (input.name !== undefined) {
      changes.name = parseProgramName(input.name)
    }
    if (input.goal !== undefined) {
      changes.goal = parseGoal(input.goal)
    }
    const program = requireProgram(db, programId)
    if (Object.keys(changes).length > 0) {
      updateProgramRow(db, program.id, changes)
    }
    return getProgram(db, program.id)
  })
}

export function activateProgram(db: Database, programId: string): Program {
  return db.transaction(() => {
    const program = requireProgram(db, programId)
    if (!program.isActive) {
      markProgramActive(db, program.id)
    }
    return getProgram(db, program.id)
  })
}

function parseProgramName(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) {
    throw new DomainError('program_name_required', 'informe o nome do programa', 'invalid')
  }
  return trimmed
}

function parseGoal(goal: string | null | undefined): Goal {
  if (goal == null || goal === '') {
    throw new DomainError('program_goal_required', 'informe o objetivo do programa', 'invalid')
  }
  const parsed = GoalSchema.safeParse(goal)
  if (!parsed.success) {
    throw new DomainError('program_goal_invalid', 'objetivo inválido', 'invalid')
  }
  return parsed.data
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

export function updateProgramDay(
  db: Database,
  programId: string,
  letterParam: string,
  input: UpdateProgramDayInput,
): Program {
  return db.transaction(() => {
    const letter = parseLetter(letterParam)
    const program = requireProgram(db, programId)
    const day = requireProgramDay(db, program.id, letter)
    if (input.label !== undefined) {
      updateProgramDayLabel(db, day.id, input.label?.trim() || null)
    }
    return getProgram(db, program.id)
  })
}

export function removeProgramDay(db: Database, programId: string, letterParam: string): Program {
  return db.transaction(() => {
    const letter = parseLetter(letterParam)
    const program = requireProgram(db, programId)
    deleteProgramDay(db, requireProgramDay(db, program.id, letter).id)
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
    const exerciseSlug = parseExerciseSlug(input.exerciseSlug)
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
    const day = requireProgramDay(db, program.id, letter)
    const exercise = findActiveExerciseBySlug(db, exerciseSlug)
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

export function updatePlannedExercise(
  db: Database,
  programId: string,
  letterParam: string,
  exerciseSlugParam: string,
  input: UpdatePlannedExerciseInput,
): Program {
  return db.transaction(() => {
    const letter = parseLetter(letterParam)
    const exerciseSlug = parseExerciseSlug(exerciseSlugParam)
    const measures = parseMeasureChanges(input)
    const program = requireProgram(db, programId)
    const planned = requirePlannedExercise(
      db,
      requireProgramDay(db, program.id, letter).id,
      exerciseSlug,
    )
    const changes = { ...measures, ...parseTargetChange(planned.exercise, input) }
    if (Object.keys(changes).length > 0) {
      updatePlannedExerciseRow(db, planned.id, changes)
    }
    return getProgram(db, program.id)
  })
}

export function removePlannedExercise(
  db: Database,
  programId: string,
  letterParam: string,
  exerciseSlugParam: string,
): Program {
  return db.transaction(() => {
    const letter = parseLetter(letterParam)
    const exerciseSlug = parseExerciseSlug(exerciseSlugParam)
    const program = requireProgram(db, programId)
    const planned = requirePlannedExercise(
      db,
      requireProgramDay(db, program.id, letter).id,
      exerciseSlug,
    )
    deletePlannedExercise(db, planned.id)
    return getProgram(db, program.id)
  })
}

// Absent keeps the value; null is refused like any other invalid value (decision 35).
function parseMeasureChanges(input: UpdatePlannedExerciseInput): PlannedExerciseChanges {
  const changes: PlannedExerciseChanges = {}
  if (input.sets !== undefined) {
    if (!isCount(input.sets)) {
      throw new DomainError(
        'planned_exercise_sets_invalid',
        'informe as séries, a partir de 1',
        'invalid',
      )
    }
    changes.sets = input.sets
  }
  if (input.loadG !== undefined) {
    changes.loadG = requireMeasure(input.loadG, LOAD_ERRORS)
  }
  if (input.restSeconds !== undefined) {
    changes.restSeconds = requireMeasure(input.restSeconds, REST_ERRORS)
  }
  return changes
}

function parseTargetChange(
  exercise: ExerciseRow,
  input: UpdatePlannedExerciseInput,
): PlannedExerciseChanges {
  refuseOtherKindTarget(exercise, input)
  const column = exercise.kind === 'reps' ? 'targetReps' : 'targetSeconds'
  const target = input[column]
  if (target === undefined) {
    return {}
  }
  if (!isCount(target)) {
    throw new DomainError('planned_exercise_target_invalid', 'alvo inválido', 'invalid')
  }
  return { [column]: target }
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

function requireMeasure(value: number | null | undefined, errors: MeasureErrors): number {
  if (value === undefined) {
    throw new DomainError(...errors.required, 'invalid')
  }
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new DomainError(...errors.invalid, 'invalid')
  }
  return value as number
}

type TargetInput = { targetReps?: number | null; targetSeconds?: number | null }

// A null target of the other kind is what the client read back, so only a value is refused.
function refuseOtherKindTarget(exercise: ExerciseRow, input: TargetInput): void {
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
}

function parseTarget(exercise: ExerciseRow, input: AddPlannedExerciseInput): number {
  refuseOtherKindTarget(exercise, input)
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

function parseExerciseSlug(exerciseSlug: string | undefined): string {
  if (!exerciseSlug) {
    throw new DomainError('planned_exercise_exercise_required', 'informe o exercício', 'invalid')
  }
  return exerciseSlug
}

function requireProgram(db: Database, programId: string): ProgramRow {
  const program = findProgramRow(db, programId)
  if (!program) {
    throw new DomainError('program_not_found', 'programa não encontrado', 'not_found')
  }
  return program
}

function requireProgramDay(db: Database, programId: string, letter: string): ProgramDayRow {
  const day = findProgramDayRow(db, programId, letter)
  if (!day) {
    throw new DomainError('program_day_not_found', 'letra não encontrada no programa', 'not_found')
  }
  return day
}

function requirePlannedExercise(
  db: Database,
  programDayId: string,
  exerciseSlug: string,
): PlannedExerciseRef {
  const planned = findPlannedExerciseRow(db, programDayId, exerciseSlug)
  if (!planned) {
    throw new DomainError('planned_exercise_not_found', 'exercício não está na letra', 'not_found')
  }
  return planned
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
