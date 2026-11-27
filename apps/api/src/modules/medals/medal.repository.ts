import { asc } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { medalAwards, workouts } from '../../db/schema.js'

export type MedalAwardRow = typeof medalAwards.$inferSelect

// The unique medal code takes the row once: a second detection of the same medal, in the same
// tick or after a restart, changes nothing (ADR-040).
export function insertMedalAward(db: Database, row: MedalAwardRow): boolean {
  const inserted = db
    .insert(medalAwards)
    .values(row)
    .onConflictDoNothing({ target: medalAwards.medalCode })
    .returning({ id: medalAwards.id })
    .all()
  return inserted.length > 0
}

export function listMedalAwards(db: Database): MedalAwardRow[] {
  return db
    .select()
    .from(medalAwards)
    .orderBy(asc(medalAwards.awardedAt), asc(medalAwards.id))
    .all()
}

export type MedalWorkoutRow = { id: string; programId: string; letter: string; startedAt: string }

export function listMedalWorkouts(db: Database): MedalWorkoutRow[] {
  return db
    .select({
      id: workouts.id,
      programId: workouts.programId,
      letter: workouts.letter,
      startedAt: workouts.startedAt,
    })
    .from(workouts)
    .orderBy(asc(workouts.startedAt), asc(workouts.id))
    .all()
}
