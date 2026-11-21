export type BackupSchedule = { timeZone: string; dailyAt: string }

type LocalMoment = { date: string; time: string }

export function isBackupDue(
  now: Date,
  lastStartedAt: Date | undefined,
  schedule: BackupSchedule,
): boolean {
  const local = toLocalMoment(now, schedule.timeZone)
  if (local.time < schedule.dailyAt) return false
  if (!lastStartedAt) return true
  const last = toLocalMoment(lastStartedAt, schedule.timeZone)
  return !(last.date === local.date && last.time >= schedule.dailyAt)
}

// Intl gives the local wall clock, so daylight saving needs no arithmetic here.
function toLocalMoment(instant: Date, timeZone: string): LocalMoment {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? ''
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  }
}
