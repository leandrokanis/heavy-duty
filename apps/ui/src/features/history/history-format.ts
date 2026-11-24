import type { HistoryWorkout } from './history.types'
import type { HistoryRange } from './history-client'

const MS_PER_MINUTE = 60_000

function yearOf(ms: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(ms)
}

function dateOptions(
  ms: number,
  nowMs: number,
  timeZone: string | undefined,
  style: 'short' | 'long',
): Intl.DateTimeFormatOptions {
  const sameYear = yearOf(ms, timeZone) === yearOf(nowMs, timeZone)
  return {
    timeZone,
    weekday: style,
    day: 'numeric',
    month: style,
    ...(sameYear ? {} : { year: 'numeric' }),
  }
}

// "sáb., 21 de nov.", with the year only outside the current one, in the device time zone.
export function formatWorkoutDate(startedAt: string, nowMs: number, timeZone?: string): string {
  const ms = Date.parse(startedAt)
  return new Intl.DateTimeFormat('pt-BR', dateOptions(ms, nowMs, timeZone, 'short')).format(ms)
}

function formatTime(ms: number, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(ms)
  const part = (type: string) => parts.find((candidate) => candidate.type === type)?.value ?? ''
  const minute = part('minute')
  return minute === '00' ? `${Number(part('hour'))}h` : `${Number(part('hour'))}h${minute}`
}

// "sábado, 21 de novembro, 18h30".
export function formatWorkoutDateTime(startedAt: string, nowMs: number, timeZone?: string): string {
  const ms = Date.parse(startedAt)
  const date = new Intl.DateTimeFormat('pt-BR', dateOptions(ms, nowMs, timeZone, 'long')).format(ms)
  return `${date}, ${formatTime(ms, timeZone)}`
}

// A workout without an end, still in progress or left open, has no duration to show.
export function workoutMinutesOf(
  workout: Pick<HistoryWorkout, 'startedAt' | 'finishedAt'>,
): number | null {
  if (workout.finishedAt === null) return null
  const elapsedMs = Date.parse(workout.finishedAt) - Date.parse(workout.startedAt)
  return Math.max(1, Math.round(elapsedMs / MS_PER_MINUTE))
}

// "24 de mai. a 24 de ago. de 2026"; the end is exclusive, so the last day holds the instant before it.
export function formatHistoryRange({ fromMs, toMs }: HistoryRange, timeZone?: string): string {
  const first = new Intl.DateTimeFormat('pt-BR', { timeZone, day: 'numeric', month: 'short' })
  const last = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${first.format(fromMs)} a ${last.format(toMs - 1)}`
}
