const MS_PER_HOUR = 3_600_000
const HOURS_PER_DAY = 24
const MS_PER_DAY = HOURS_PER_DAY * MS_PER_HOUR
const LAST_WEEKDAY_DAY = 6

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

type LocalMoment = { dayNumber: number; weekday: number; day: number; month: number; time: string }

function localMomentOf(ms: number, timeZone?: string): LocalMoment {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(ms)
  const part = (type: string) => Number(parts.find((candidate) => candidate.type === type)?.value)
  const [year, month, day, hour, minute] = [
    part('year'),
    part('month'),
    part('day'),
    part('hour'),
    part('minute'),
  ] as [number, number, number, number, number]
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY)
  return {
    dayNumber,
    weekday: new Date(dayNumber * MS_PER_DAY).getUTCDay(),
    day,
    month,
    time: minute === 0 ? `${hour}h` : `${hour}h${String(minute).padStart(2, '0')}`,
  }
}

const twoDigits = (value: number) => String(value).padStart(2, '0')

// "hoje 21h", "amanhã 9h", "qui 20h" within six days, "12/12 9h" after that, in the device time zone.
export function formatWindowWhen(atMs: number, nowMs: number, timeZone?: string): string {
  const at = localMomentOf(atMs, timeZone)
  const daysAhead = at.dayNumber - localMomentOf(nowMs, timeZone).dayNumber
  if (daysAhead === 0) return `hoje ${at.time}`
  if (daysAhead === 1) return `amanhã ${at.time}`
  if (daysAhead > 1 && daysAhead <= LAST_WEEKDAY_DAY) {
    return `${WEEKDAYS[at.weekday]} ${at.time}`
  }
  return `${twoDigits(at.day)}/${twoDigits(at.month)} ${at.time}`
}

// "há 3 h" under a day, then whole days; under one hour there is no number to show.
export function formatCoolingFor(closedAtMs: number, nowMs: number): string {
  const hours = Math.floor(Math.max(0, nowMs - closedAtMs) / MS_PER_HOUR)
  if (hours < 1) return 'há menos de 1 h'
  if (hours < HOURS_PER_DAY) return `há ${hours} h`
  const days = Math.floor(hours / HOURS_PER_DAY)
  return days === 1 ? 'há 1 dia' : `há ${days} dias`
}
