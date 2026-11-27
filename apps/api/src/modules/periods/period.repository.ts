import { and, asc, eq, gte, lt } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { periods, workouts } from '../../db/schema.js'

export type PeriodRow = {
  id: string
  number: number
  startsAt: string
  endsAt: string
  intention: string | null
  frozenAt: string | null
}

export function findPeriod(db: Database, number: number): PeriodRow | undefined {
  return db.select().from(periods).where(eq(periods.number, number)).get()
}

export function listPeriods(db: Database): PeriodRow[] {
  return db.select().from(periods).orderBy(asc(periods.number)).all()
}

// The unique number keeps one row per period when two callers ensure the same period.
export function insertPeriod(db: Database, row: Omit<PeriodRow, 'intention' | 'frozenAt'>): void {
  db.insert(periods).values(row).onConflictDoNothing({ target: periods.number }).run()
}

export function updatePeriodIntention(
  db: Database,
  number: number,
  intention: string | null,
): void {
  db.update(periods).set({ intention }).where(eq(periods.number, number)).run()
}

export type PeriodWorkoutRow = { id: string; letter: string; startedAt: string }

// Both bounds are UTC instants in the toISOString() form, so text order is time order.
export function listWorkoutsStartedBetween(
  db: Database,
  fromInstant: string,
  toInstant: string,
): PeriodWorkoutRow[] {
  return db
    .select({ id: workouts.id, letter: workouts.letter, startedAt: workouts.startedAt })
    .from(workouts)
    .where(and(gte(workouts.startedAt, fromInstant), lt(workouts.startedAt, toInstant)))
    .all()
}
