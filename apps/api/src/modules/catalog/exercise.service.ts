import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { DomainError } from '../../errors/domain-error.js'
import { type AddExerciseInput, type Exercise, ExerciseKindSchema } from './catalog.schemas.js'
import {
  type ExerciseMuscleRole,
  type ExerciseRow,
  existsExerciseWithSlug,
  findMusclesBySlugs,
  insertExerciseWithMuscles,
  listActiveExerciseRows,
  listExerciseMuscleRows,
  type MuscleRow,
} from './exercise.repository.js'
import { toSlug } from './slug.js'

type RoledMuscleRow = MuscleRow & { role: ExerciseMuscleRole }

export function listExercises(db: Database): { exercises: Exercise[] } {
  const exerciseRows = listActiveExerciseRows(db)
  const muscleRows = listExerciseMuscleRows(
    db,
    exerciseRows.map((exercise) => exercise.id),
  )
  return {
    exercises: exerciseRows.map((exercise) =>
      toExercise(
        exercise,
        muscleRows.filter((muscle) => muscle.exerciseId === exercise.id),
      ),
    ),
  }
}

export function addExercise(db: Database, input: AddExerciseInput): Exercise {
  return db.transaction(() => {
    const name = (input.name ?? '').trim()
    const slug = toSlug(name)
    if (!slug) {
      throw new DomainError('exercise_name_required', 'informe o nome do exercício', 'invalid')
    }
    if (!input.kind) {
      throw new DomainError('exercise_kind_required', 'informe o tipo do exercício', 'invalid')
    }
    const kind = ExerciseKindSchema.safeParse(input.kind)
    if (!kind.success) {
      throw new DomainError('exercise_kind_invalid', 'tipo de exercício inválido', 'invalid')
    }
    const primarySlugs = input.primaryMuscleSlugs ?? []
    const secondarySlugs = input.secondaryMuscleSlugs ?? []
    if (primarySlugs.length === 0) {
      throw new DomainError('exercise_muscle_required', 'informe ao menos um músculo', 'invalid')
    }
    const allSlugs = [...primarySlugs, ...secondarySlugs]
    if (new Set(allSlugs).size !== allSlugs.length) {
      throw new DomainError(
        'exercise_muscle_duplicated',
        'músculo repetido no exercício',
        'invalid',
      )
    }
    const found = findMusclesBySlugs(db, allSlugs)
    if (found.length !== allSlugs.length) {
      throw new DomainError('muscle_not_found', 'músculo não encontrado', 'not_found_reference')
    }
    if (existsExerciseWithSlug(db, slug)) {
      throw new DomainError('exercise_already_exists', 'exercício já cadastrado', 'conflict')
    }
    const roled: RoledMuscleRow[] = found.map((muscle) => ({
      ...muscle,
      role: primarySlugs.includes(muscle.slug) ? 'primary' : 'secondary',
    }))

    const exercise: ExerciseRow = {
      id: createId(),
      slug,
      name,
      kind: kind.data,
    }
    insertExerciseWithMuscles(
      db,
      exercise,
      roled.map((muscle) => ({ muscleId: muscle.id, role: muscle.role })),
    )
    return toExercise(exercise, roled)
  })
}

const ROLE_ORDER: Record<ExerciseMuscleRole, number> = { primary: 0, secondary: 1 }

function toExercise(exercise: ExerciseRow, muscleRows: readonly RoledMuscleRow[]): Exercise {
  const sortedMuscles = [...muscleRows].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || compareBinary(a.slug, b.slug),
  )
  const groupsById = new Map(
    [...muscleRows]
      .sort((a, b) => a.muscleGroupPosition - b.muscleGroupPosition)
      .map((muscle) => [muscle.muscleGroup.id, muscle.muscleGroup]),
  )
  return {
    ...exercise,
    muscles: sortedMuscles.map(({ id, slug, name, role, muscleGroup }) => ({
      id,
      slug,
      name,
      role,
      muscleGroup,
    })),
    muscleGroups: [...groupsById.values()],
  }
}

// Same order as SQLite's default BINARY collation used by ORDER BY slug.
function compareBinary(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}
