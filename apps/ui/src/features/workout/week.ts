// The week starts on Monday at 00:00 in the time zone of the device; the API has none (D74).
export function weekStartOf(nowMs: number): number {
  const start = new Date(nowMs)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start.getTime()
}

// A screen left open across Monday at 00:00 keeps no count of the past week (D77).
export function countOfThisWeek<T extends { from: string }>(
  week: T | null,
  nowMs: number,
): T | null {
  return week && Date.parse(week.from) === weekStartOf(nowMs) ? week : null
}
