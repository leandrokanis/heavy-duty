import type { Database } from '../../db/connection.js'
import { type MuscleGroupSeed, upsertMuscleGroupBySlug } from './muscle-group.repository.js'

// Initial catalog of muscle groups fixed by D30 in docs/prd.md, in D30 order.
export const D30_MUSCLE_GROUPS: readonly MuscleGroupSeed[] = [
  { slug: 'chest', name: 'peito', position: 1 },
  { slug: 'back', name: 'costas', position: 2 },
  { slug: 'lower-back', name: 'lombar', position: 3 },
  { slug: 'shoulders', name: 'ombros', position: 4 },
  { slug: 'biceps', name: 'bíceps', position: 5 },
  { slug: 'triceps', name: 'tríceps', position: 6 },
  { slug: 'abs', name: 'abdômen', position: 7 },
  { slug: 'quadriceps', name: 'quadríceps', position: 8 },
  { slug: 'hamstrings', name: 'posteriores de coxa', position: 9 },
  { slug: 'glutes', name: 'glúteos', position: 10 },
  { slug: 'calves', name: 'panturrilhas', position: 11 },
]

export function seedMuscleGroups(db: Database): void {
  const seedAll = db.$client.transaction(() => {
    for (const group of D30_MUSCLE_GROUPS) {
      upsertMuscleGroupBySlug(db, group)
    }
  })
  seedAll()
}
