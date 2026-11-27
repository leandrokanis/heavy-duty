import { addLocalDays, instantAtLocal, localTimeOf } from '../notifications/notice-time.js'
import { PERIOD_MS, PERIOD_WEEKS, WEEK_MS } from './periods.config.js'

export type PeriodBounds = { number: number; startsAtMs: number; endsAtMs: number }

// Monday 00:00 of the week of now, by the wall clock of the zone (D95).
export function firstPeriodStartOf(nowMs: number, timeZone: string): number {
  const { date } = localTimeOf(nowMs, timeZone)
  const daysSinceMonday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
  return instantAtLocal(addLocalDays(date, -daysSinceMonday), 0, timeZone)
}

// Periods follow each other in blocks of 12 weeks from the first one, with no realignment
// (ADR-039); an instant before the first period falls in it.
export function periodAt(firstStartMs: number, instantMs: number): PeriodBounds {
  const index = Math.max(0, Math.floor((instantMs - firstStartMs) / PERIOD_MS))
  return periodNumbered(firstStartMs, index + 1)
}

export function periodNumbered(firstStartMs: number, number: number): PeriodBounds {
  const startsAtMs = firstStartMs + (number - 1) * PERIOD_MS
  return { number, startsAtMs, endsAtMs: startsAtMs + PERIOD_MS }
}

// The week of the server is a block of 7 × 24 h from the start of the period (D96).
export function weekOfPeriod(startsAtMs: number, instantMs: number): number {
  const week = Math.floor((instantMs - startsAtMs) / WEEK_MS) + 1
  return Math.min(PERIOD_WEEKS, Math.max(1, week))
}
