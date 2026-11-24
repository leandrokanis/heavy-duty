import type { HistoryRange } from './history-client'

// The longest interval GET /api/workouts accepts.
export const HISTORY_PAGE_DAYS = 92

const DAY_MS = 86_400_000

// The first page ends a day after now, so a phone clock behind the server still sees today.
export function historyRangeOf(pageIndex: number, nowMs: number): HistoryRange {
  const toMs = nowMs + DAY_MS - pageIndex * HISTORY_PAGE_DAYS * DAY_MS
  return { fromMs: toMs - HISTORY_PAGE_DAYS * DAY_MS, toMs }
}
