import { desc, lt } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { weeklyGoals } from '../../db/schema.js'

export type WeeklyGoalRow = { id: string; windows: number; definedAt: string }

export function insertWeeklyGoal(db: Database, row: WeeklyGoalRow): void {
  db.insert(weeklyGoals).values(row).run()
}

// definedAt is a UTC instant in the toISOString() form, so text order is time order; the UUID v7
// breaks a tie by the order of insertion.
export function findWeeklyGoalBefore(db: Database, instant: string): number | null {
  const row = db
    .select({ windows: weeklyGoals.windows })
    .from(weeklyGoals)
    .where(lt(weeklyGoals.definedAt, instant))
    .orderBy(desc(weeklyGoals.definedAt), desc(weeklyGoals.id))
    .limit(1)
    .get()
  return row?.windows ?? null
}
