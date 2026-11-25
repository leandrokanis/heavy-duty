export type LocalTime = { date: string; hour: number; minute: number }

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const

function partsOf(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ms)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((candidate) => candidate.type === type)?.value)
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
  }
}

// Intl gives the wall clock of the zone, so daylight saving needs no table here.
export function localTimeOf(ms: number, timeZone: string): LocalTime {
  const { year, month, day, hour, minute } = partsOf(ms, timeZone)
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return { date, hour, minute }
}

function offsetMsAt(ms: number, timeZone: string): number {
  const { year, month, day, hour, minute } = partsOf(ms, timeZone)
  return Date.UTC(year, month - 1, day, hour, minute) - Math.floor(ms / MINUTE_MS) * MINUTE_MS
}

// The instant of a wall clock time in the zone; the second pass settles a change of offset.
export function instantAtLocal(date: string, hour: number, timeZone: string): number {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  const wall = Date.UTC(year, month - 1, day, hour)
  const first = wall - offsetMsAt(wall, timeZone)
  return wall - offsetMsAt(first, timeZone)
}

export function addLocalDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

// "hoje", "amanhã" or the day of the week, by the wall clock of the zone.
export function dayWordOf(eventMs: number, nowMs: number, timeZone: string): string {
  const event = localTimeOf(eventMs, timeZone).date
  const today = localTimeOf(nowMs, timeZone).date
  if (event === today) return 'hoje'
  if (event === addLocalDays(today, 1)) return 'amanhã'
  return WEEKDAYS[new Date(`${event}T00:00:00Z`).getUTCDay()] as string
}

// "9h" or "9h30", the way the prototype writes the time.
export function clockOf(ms: number, timeZone: string): string {
  const { hour, minute } = localTimeOf(ms, timeZone)
  return minute === 0 ? `${hour}h` : `${hour}h${String(minute).padStart(2, '0')}`
}
