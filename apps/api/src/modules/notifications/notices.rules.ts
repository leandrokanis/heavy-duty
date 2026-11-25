import { letterForGroupOf, type PlannedDay } from '@heavy-duty/game'
import { addLocalDays, instantAtLocal, localTimeOf } from './notice-time.js'
import { NOTICE_CONFIG, type NoticeConfig, type NoticeKind } from './notices.config.js'

const HOUR_MS = 60 * 60 * 1000

export type NoticeGroup = { slug: string; name: string }
export type NoticeWindow = { opensAtMs: number; closesAtMs: number }
export type NoticeLevel = { level: number; cooling: boolean; nextDropAtMs: number | null }

export type NoticesInput = {
  // The letters of the active program, in program order, with the primary groups of each exercise.
  days: readonly PlannedDay[]
  groupNames: Readonly<Record<string, string>>
  // Only the groups ever trained have a window.
  windows: Readonly<Record<string, NoticeWindow>>
  levels: Readonly<Record<string, NoticeLevel>>
  nowMs: number
  timeZone: string
}

export type Notice = {
  // Unique per notice: the kind, the letter or the group, and the instant that names the event.
  key: string
  kind: NoticeKind
  letter: string | null
  groups: NoticeGroup[]
  eventAtMs: number
  dueAtMs: number
  // Only on a level drop: the level now and the level after the drop.
  level?: { now: number; after: number }
}

type QuietConfig = Pick<NoticeConfig, 'quietHours'>

export function isQuietAt(ms: number, timeZone: string, config: QuietConfig = NOTICE_CONFIG) {
  const { hour } = localTimeOf(ms, timeZone)
  const { startHour, endHour } = config.quietHours
  return hour >= startHour || hour < endHour
}

// D80: a notice whose time falls in the quiet hours goes out earlier, at the 21h before them.
export function scheduledAtOf(
  eventAtMs: number,
  kind: NoticeKind,
  timeZone: string,
  config: Pick<NoticeConfig, 'leadHours' | 'quietHours'> = NOTICE_CONFIG,
): number {
  const dueAtMs = eventAtMs - config.leadHours[kind] * HOUR_MS
  if (!isQuietAt(dueAtMs, timeZone, config)) return dueAtMs
  const { date, hour } = localTimeOf(dueAtMs, timeZone)
  const evening = hour >= config.quietHours.startHour ? date : addLocalDays(date, -1)
  return instantAtLocal(evening, config.quietHours.sendHour, timeZone)
}

function groupSlugsOf(day: PlannedDay): string[] {
  return [...new Set(day.exercises.flatMap((exercise) => exercise.muscleGroupSlugs))]
}

function groupOf(slug: string, input: NoticesInput): NoticeGroup {
  return { slug, name: input.groupNames[slug] ?? slug }
}

const iso = (ms: number) => new Date(ms).toISOString()

// D82: a letter mostly resting (D69) opens when it stops being so; the notice lists the groups
// that open up to then. A letter already available has no notice.
function openNoticeOf(day: PlannedDay, input: NoticesInput): Omit<Notice, 'dueAtMs'> | null {
  const slugs = groupSlugsOf(day)
  const resting = slugs
    .filter((slug) => {
      const window = input.windows[slug]
      return window !== undefined && input.nowMs < window.opensAtMs
    })
    .sort((a, b) => (input.windows[a]?.opensAtMs ?? 0) - (input.windows[b]?.opensAtMs ?? 0))
  if (resting.length * 2 <= slugs.length) return null
  const toOpen = resting.length - Math.floor(slugs.length / 2)
  const eventAtMs = input.windows[resting[toOpen - 1] as string]?.opensAtMs as number
  return {
    key: `window_open:${day.letter}:${iso(eventAtMs)}`,
    kind: 'window_open',
    letter: day.letter,
    groups: resting
      .filter((slug) => (input.windows[slug]?.opensAtMs ?? 0) <= eventAtMs)
      .map((slug) => groupOf(slug, input)),
    eventAtMs,
  }
}

// D83: at the first close among the groups of the letter in their window; training a group in the
// window takes it out of the window, so the notice goes away with no rule of its own.
function closeNoticeOf(
  day: PlannedDay,
  input: NoticesInput,
  config: Pick<NoticeConfig, 'closeSpanHours'>,
): Omit<Notice, 'dueAtMs'> | null {
  const open = groupSlugsOf(day).filter((slug) => {
    const window = input.windows[slug]
    return (
      window !== undefined && window.opensAtMs <= input.nowMs && input.nowMs < window.closesAtMs
    )
  })
  if (open.length === 0) return null
  const closesAt = (slug: string) => input.windows[slug]?.closesAtMs as number
  const eventAtMs = Math.min(...open.map(closesAt))
  return {
    key: `window_close:${day.letter}:${iso(eventAtMs)}`,
    kind: 'window_close',
    letter: day.letter,
    groups: open
      .filter((slug) => closesAt(slug) <= eventAtMs + config.closeSpanHours * HOUR_MS)
      .map((slug) => groupOf(slug, input)),
    eventAtMs,
  }
}

// D84: one notice per cooling, keyed by the close that started it, so the drops after the first
// find the key taken; level 1 never drops, so it has no nextDropAt.
function dropNoticeOf(slug: string, input: NoticesInput): Omit<Notice, 'dueAtMs'> | null {
  const level = input.levels[slug]
  const window = input.windows[slug]
  if (!level?.cooling || level.nextDropAtMs === null || window === undefined) return null
  return {
    key: `level_drop:${slug}:${iso(window.closesAtMs)}`,
    kind: 'level_drop',
    letter: letterForGroupOf(input.days, slug),
    groups: [groupOf(slug, input)],
    eventAtMs: level.nextDropAtMs,
    level: { now: level.level, after: level.level - 1 },
  }
}

// Every notice of the program now, due or not, with the instant it goes out.
export function noticesOf(input: NoticesInput, config: NoticeConfig = NOTICE_CONFIG): Notice[] {
  const days = input.days.filter((day) => groupSlugsOf(day).length > 0)
  const programGroups = [...new Set(days.flatMap(groupSlugsOf))]
  const notices = [
    ...days.map((day) => openNoticeOf(day, input)),
    ...days.map((day) => closeNoticeOf(day, input, config)),
    ...programGroups.map((slug) => dropNoticeOf(slug, input)),
  ].filter((notice) => notice !== null)
  return notices.map((notice) => ({
    ...notice,
    dueAtMs: scheduledAtOf(notice.eventAtMs, notice.kind, input.timeZone, config),
  }))
}

// D86: due once its time came and before its event, and never in the quiet hours. A notice whose
// event already came is dropped, so a server back from a stop sends nothing old.
export function dueNoticesOf(input: NoticesInput, config: NoticeConfig = NOTICE_CONFIG): Notice[] {
  if (isQuietAt(input.nowMs, input.timeZone, config)) return []
  return noticesOf(input, config).filter(
    (notice) => notice.dueAtMs <= input.nowMs && input.nowMs < notice.eventAtMs,
  )
}
