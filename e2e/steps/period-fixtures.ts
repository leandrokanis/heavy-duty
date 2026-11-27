import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { API_DATABASE_PATH } from './api-server.js'

const DAY_MS = 24 * 60 * 60 * 1000
export const WEEK_MS = 7 * DAY_MS
// NOTICE_TIME_ZONE is unset in the e2e, so the API uses America/Sao_Paulo, UTC-3 all year.
const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000

function withDatabase<T>(action: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(API_DATABASE_PATH)
  try {
    db.exec('PRAGMA busy_timeout = 5000')
    return action(db)
  } finally {
    db.close()
  }
}

// Monday 00:00 of the week of the real clock in São Paulo, in UTC milliseconds.
export function mondayOfThisWeekMs(nowMs: number = Date.now()): number {
  const wall = new Date(nowMs - SAO_PAULO_OFFSET_MS)
  const daysSinceMonday = (wall.getUTCDay() + 6) % 7
  return (
    Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() - daysSinceMonday) +
    SAO_PAULO_OFFSET_MS
  )
}

// Moves the start of period 1 back, as if the API first started weeks before this week.
export function startFirstPeriodWeeksAgo(weeks: number): void {
  const startsAtMs = mondayOfThisWeekMs() - weeks * WEEK_MS
  withDatabase((db) => {
    db.exec('DELETE FROM periods')
    db.prepare('INSERT INTO periods (id, number, starts_at, ends_at) VALUES (?, 1, ?, ?)').run(
      randomUUID(),
      new Date(startsAtMs).toISOString(),
      new Date(startsAtMs + 12 * WEEK_MS).toISOString(),
    )
  })
}

// The only weekly goal, set before the weeks it covers (D75).
export function setOnlyWeeklyGoal(windows: number, definedAtMs: number): void {
  withDatabase((db) => {
    db.exec('DELETE FROM weekly_goals')
    db.prepare('INSERT INTO weekly_goals (id, windows, defined_at) VALUES (?, ?, ?)').run(
      randomUUID(),
      windows,
      new Date(definedAtMs).toISOString(),
    )
  })
}
