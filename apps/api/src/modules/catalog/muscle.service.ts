import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { DomainError } from '../../errors/domain-error.js'
import type { AddMuscleInput, Muscle } from './catalog.schemas.js'
import { existsMuscleWithSlug, insertMuscle, listMuscleRows } from './muscle.repository.js'
import { findMuscleGroupBySlug } from './muscle-group.repository.js'

export function listMuscles(db: Database): { muscles: Muscle[] } {
  return { muscles: listMuscleRows(db) }
}

export function addMuscle(db: Database, input: AddMuscleInput): Muscle {
  const name = (input.name ?? '').trim()
  const slug = toMuscleSlug(name)
  if (!input.muscleGroupSlug) {
    throw new DomainError('muscle_group_required', 'informe o grupo muscular', 'invalid')
  }
  if (!slug) {
    throw new DomainError('muscle_name_required', 'informe o nome do músculo', 'invalid')
  }
  const group = findMuscleGroupBySlug(db, input.muscleGroupSlug)
  if (!group) {
    throw new DomainError(
      'muscle_group_not_found',
      'grupo muscular não encontrado',
      'not_found_reference',
    )
  }
  if (existsMuscleWithSlug(db, slug)) {
    throw new DomainError('muscle_already_exists', 'músculo já cadastrado', 'conflict')
  }

  const muscle: Muscle = {
    id: createId(),
    slug,
    name,
    muscleGroup: { id: group.id, slug: group.slug, name: group.name },
  }
  insertMuscle(db, { id: muscle.id, muscleGroupId: group.id, slug, name })
  return muscle
}

function toMuscleSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
