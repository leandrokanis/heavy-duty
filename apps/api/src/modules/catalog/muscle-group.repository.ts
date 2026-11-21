import { asc, eq } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { muscleGroups } from '../../db/schema.js'
import type { MuscleGroup } from './catalog.schemas.js'

export type MuscleGroupSeed = Omit<MuscleGroup, 'id'>

export function listMuscleGroupRows(db: Database): MuscleGroup[] {
  return db.select().from(muscleGroups).orderBy(asc(muscleGroups.position)).all()
}

export function findMuscleGroupBySlug(db: Database, slug: string): MuscleGroup | undefined {
  return db.select().from(muscleGroups).where(eq(muscleGroups.slug, slug)).get()
}

export function upsertMuscleGroupBySlug(db: Database, group: MuscleGroupSeed): void {
  db.insert(muscleGroups)
    .values({ id: createId(), ...group })
    .onConflictDoUpdate({
      target: muscleGroups.slug,
      set: { name: group.name, position: group.position },
    })
    .run()
}
