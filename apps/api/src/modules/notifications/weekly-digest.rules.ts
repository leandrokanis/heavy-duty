import { personalRecordFlags } from '@heavy-duty/game'
import { instantAtLocal, localTimeOf } from './notice-time.js'
import { NOTICE_CONFIG, type NoticeConfig } from './notices.config.js'
import { isQuietAt } from './notices.rules.js'

const HOUR_MS = 60 * 60 * 1000

export type DigestWeek = { startsAtMs: number; endsAtMs: number }

export type DueWeeklyDigest = {
  // Unique per week: the email goes once even across restarts (ADR-036, ADR-041).
  key: string
  weekStartsAtMs: number
  weekEndsAtMs: number
  dueAtMs: number
}

function dueAtOf(week: DigestWeek, timeZone: string, config: NoticeConfig): number {
  const { date } = localTimeOf(week.endsAtMs, timeZone)
  return Math.max(week.endsAtMs, instantAtLocal(date, config.weeklyDigest.sendHour, timeZone))
}

// The digest of the week that ended goes from its time to catchUpHours after, never in the quiet
// hours (D80); after that it is dropped, so a server back from a long stop sends nothing old.
export function dueWeeklyDigestOf(
  input: { weeks: readonly DigestWeek[]; nowMs: number; timeZone: string },
  config: NoticeConfig = NOTICE_CONFIG,
): DueWeeklyDigest | null {
  const { nowMs, timeZone } = input
  if (isQuietAt(nowMs, timeZone, config)) return null
  const ended = input.weeks.filter((week) => week.endsAtMs <= nowMs).at(-1)
  if (!ended) return null
  const dueAtMs = dueAtOf(ended, timeZone, config)
  if (nowMs < dueAtMs || nowMs >= dueAtMs + config.weeklyDigest.catchUpHours * HOUR_MS) {
    return null
  }
  return {
    key: `weekly_digest:${new Date(ended.startsAtMs).toISOString()}`,
    weekStartsAtMs: ended.startsAtMs,
    weekEndsAtMs: ended.endsAtMs,
    dueAtMs,
  }
}

export type DigestSet = {
  workoutId: string
  exerciseId: string
  exerciseName: string
  performedAtMs: number
  loadG: number
  reps: number | null
}

export type DigestGroupLevel = {
  slug: string
  name: string
  levelAtStart: number
  levelAtEnd: number
}

export type DigestInput = {
  week: DigestWeek
  weeklyGoal: number | null
  windowsUsed: number
  windowsMissed: number
  weekPoints: number
  weekStreak: number
  levels: readonly DigestGroupLevel[]
  // The whole history, so the sets before the week set the records to beat (D59).
  sets: readonly DigestSet[]
  medals: readonly { name: string; awardedAtMs: number }[]
}

export type WeeklyDigest = {
  weekStartsAtMs: number
  weekEndsAtMs: number
  weeklyGoal: number | null
  windowsUsed: number
  windowsMissed: number
  weekPoints: number
  weekStreak: number
  levels: { slug: string; name: string; from: number; to: number }[]
  // Only the name of each exercise: the digest shows no load (D107).
  records: string[]
  medals: string[]
}

function inWeek(week: DigestWeek, atMs: number): boolean {
  return week.startsAtMs <= atMs && atMs < week.endsAtMs
}

function recordsOf(week: DigestWeek, sets: readonly DigestSet[]): string[] {
  const ordered = [...sets].sort(
    (a, b) =>
      a.performedAtMs - b.performedAtMs ||
      (a.workoutId < b.workoutId ? -1 : a.workoutId > b.workoutId ? 1 : 0),
  )
  const setsOfExercise = new Map<string, DigestSet[]>()
  for (const set of ordered) {
    setsOfExercise.set(set.exerciseId, [...(setsOfExercise.get(set.exerciseId) ?? []), set])
  }
  const firstRecords = [...setsOfExercise.values()].flatMap((exerciseSets) => {
    const flags = personalRecordFlags([], exerciseSets)
    const record = exerciseSets.find(
      (set, index) => flags[index] && inWeek(week, set.performedAtMs),
    )
    return record ? [record] : []
  })
  return firstRecords
    .sort((a, b) => a.performedAtMs - b.performedAtMs)
    .map(({ exerciseName }) => exerciseName)
}

// The content of the week, the minimum of ADR-007 (D107).
export function weeklyDigestOf(input: DigestInput): WeeklyDigest {
  const { week } = input
  return {
    weekStartsAtMs: week.startsAtMs,
    weekEndsAtMs: week.endsAtMs,
    weeklyGoal: input.weeklyGoal,
    windowsUsed: input.windowsUsed,
    windowsMissed: input.windowsMissed,
    weekPoints: input.weekPoints,
    weekStreak: input.weekStreak,
    levels: input.levels
      .filter(({ levelAtStart, levelAtEnd }) => levelAtStart !== levelAtEnd)
      .map(({ slug, name, levelAtStart, levelAtEnd }) => ({
        slug,
        name,
        from: levelAtStart,
        to: levelAtEnd,
      })),
    records: recordsOf(week, input.sets),
    medals: input.medals
      .filter(({ awardedAtMs }) => inWeek(week, awardedAtMs))
      .sort((a, b) => a.awardedAtMs - b.awardedAtMs)
      .map(({ name }) => name),
  }
}
