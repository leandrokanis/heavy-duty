import { asc, eq } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { muscleGroups, muscles } from '../../db/schema.js'
import type { Muscle } from './catalog.schemas.js'

export type NewMuscle = {
  id: string
  muscleGroupId: string
  slug: string
  name: string
}

const muscleWithGroup = {
  id: muscles.id,
  slug: muscles.slug,
  name: muscles.name,
  muscleGroup: { id: muscleGroups.id, slug: muscleGroups.slug, name: muscleGroups.name },
}

export function listMuscleRows(db: Database): Muscle[] {
  return db
    .select(muscleWithGroup)
    .from(muscles)
    .innerJoin(muscleGroups, eq(muscles.muscleGroupId, muscleGroups.id))
    .orderBy(asc(muscles.slug))
    .all()
}

export function existsMuscleWithSlug(db: Database, slug: string): boolean {
  return (
    db.select({ id: muscles.id }).from(muscles).where(eq(muscles.slug, slug)).get() !== undefined
  )
}

export function insertMuscle(db: Database, muscle: NewMuscle): void {
  db.insert(muscles).values(muscle).run()
}
