const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

// The week of the copy follows the clock of the phone, so it stays right with no signal.
export function weekOfPeriod(startsAt: string, weekCount: number, nowMs: number): number {
  const week = Math.floor((nowMs - Date.parse(startsAt)) / WEEK_MS) + 1
  return Math.min(weekCount, Math.max(1, week))
}

function dayOf(ms: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone }).format(ms)
}

// endsAt is the start of the next period, so the last day is the one before it.
export function formatPeriodDays(startsAt: string, endsAt: string, timeZone?: string): string {
  return `De ${dayOf(Date.parse(startsAt), timeZone)} a ${dayOf(Date.parse(endsAt) - DAY_MS, timeZone)}`
}
