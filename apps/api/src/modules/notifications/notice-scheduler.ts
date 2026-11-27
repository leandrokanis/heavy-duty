import type { PlannedDay } from '@heavy-duty/game'
import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { listMuscleGroupLevels } from '../windows/progress.service.js'
import { listActivityWindows } from '../windows/window-state.service.js'
import { getToday } from '../workouts/today.service.js'
import { pushMessageOf } from './notice-format.js'
import { dueNoticesOf, type Notice, type NoticesInput } from './notices.rules.js'
import {
  claimNotification,
  finishNotification,
  type NotificationClaim,
} from './notification.repository.js'
import type { PushSender } from './push-sender.js'
import { sendPushToAll } from './push-subscription.service.js'
import { dueWeeklyDigestOf, type WeeklyDigest } from './weekly-digest.rules.js'
import { digestWeeksOf, weeklyDigestFor } from './weekly-digest.service.js'

export const NOTICE_INTERVAL_MS = 60_000

const MAX_ERROR_LENGTH = 500

export type ChannelResult = {
  status: 'sent' | 'failed' | 'skipped'
  error: string | null
  // Only on an email sent: the hash of the token of its link to turn the emails off (ADR-037).
  unsubscribeTokenHash?: string
}

// A channel delivers one notice; the scheduler goes through push and email in turn.
export type NoticeChannel = {
  name: 'push' | 'email'
  deliver: (notice: Notice, nowMs: number) => Promise<ChannelResult>
  // Only the email channel sends the weekly digest (ADR-041).
  deliverDigest?: (digest: WeeklyDigest, nowMs: number) => Promise<ChannelResult>
}

export type NoticeLog = { error: (message: string) => void }

export type NoticeTickDeps = {
  db: Database
  now: () => Date
  timeZone: string
  channels: readonly NoticeChannel[]
  log: NoticeLog
}

export function createPushChannel(
  db: Database,
  sender: PushSender,
  timeZone: string,
): NoticeChannel {
  return {
    name: 'push',
    async deliver(notice, nowMs) {
      const delivery = await sendPushToAll(db, sender, pushMessageOf(notice, nowMs, timeZone))
      if (delivery.sent > 0) return { status: 'sent', error: null }
      if (delivery.failures.length > 0) {
        return { status: 'failed', error: delivery.failures[0] ?? null }
      }
      return { status: 'skipped', error: 'no push subscription' }
    },
  }
}

// The letters of the active program, the windows and the levels, all derived from the database
// at each tick (ADR-010, ADR-036).
export function loadNoticesInput(db: Database, now: Date, timeZone: string): NoticesInput {
  const days: PlannedDay[] = getToday(db).days.map((day) => ({
    letter: day.letter,
    exercises: day.exercises.map((exercise) => ({
      sets: exercise.sets,
      muscleGroupSlugs: exercise.muscleGroups.map(({ slug }) => slug),
    })),
  }))
  const windows = listActivityWindows(db, now).groups
  const levels = listMuscleGroupLevels(db, now).groups
  return {
    days,
    groupNames: Object.fromEntries(
      windows.map(({ muscleGroup }) => [muscleGroup.slug, muscleGroup.name]),
    ),
    windows: Object.fromEntries(
      windows.flatMap(({ muscleGroup, opensAt, closesAt }) =>
        opensAt && closesAt
          ? [
              [
                muscleGroup.slug,
                { opensAtMs: Date.parse(opensAt), closesAtMs: Date.parse(closesAt) },
              ],
            ]
          : [],
      ),
    ),
    levels: Object.fromEntries(
      levels.map(({ muscleGroup, level, cooling, nextDropAt }) => [
        muscleGroup.slug,
        { level, cooling, nextDropAtMs: nextDropAt === null ? null : Date.parse(nextDropAt) },
      ]),
    ),
    nowMs: now.getTime(),
    timeZone,
  }
}

function messageOf(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, MAX_ERROR_LENGTH)
}

// The row goes in before the send, so a restart never sends the same notice twice (ADR-036).
async function deliverClaimed(
  deps: NoticeTickDeps,
  claim: Omit<NotificationClaim, 'id' | 'createdAt'>,
  now: Date,
  deliver: () => Promise<ChannelResult>,
): Promise<void> {
  const id = createId(now.getTime())
  if (!claimNotification(deps.db, { ...claim, id, createdAt: now.toISOString() })) return
  // A channel that throws is recorded as failed, and the next channel still goes (D32).
  const result = await deliver().catch(
    (error): ChannelResult => ({
      status: 'failed',
      error: `channel failed: ${messageOf(error)}`,
    }),
  )
  finishNotification(deps.db, id, {
    status: result.status,
    error: result.error?.slice(0, MAX_ERROR_LENGTH) ?? null,
    finishedAt: deps.now().toISOString(),
    unsubscribeTokenHash: result.unsubscribeTokenHash ?? null,
  })
}

function deliverOnce(
  deps: NoticeTickDeps,
  channel: NoticeChannel,
  notice: Notice,
  now: Date,
): Promise<void> {
  return deliverClaimed(
    deps,
    {
      noticeKey: notice.key,
      kind: notice.kind,
      channel: channel.name,
      letter: notice.letter,
      muscleGroupSlugs: JSON.stringify(notice.groups.map(({ slug }) => slug)),
      dueAt: new Date(notice.dueAtMs).toISOString(),
      eventAt: new Date(notice.eventAtMs).toISOString(),
    },
    now,
    () => channel.deliver(notice, now.getTime()),
  )
}

// Monday at 7h, the digest of the week that ended goes by the email channel only (D106, ADR-041).
async function deliverWeeklyDigest(deps: NoticeTickDeps, now: Date): Promise<void> {
  const channels = deps.channels.flatMap(({ name, deliverDigest }) =>
    deliverDigest ? [{ name, deliverDigest }] : [],
  )
  if (channels.length === 0) return
  const nowMs = now.getTime()
  let due: ReturnType<typeof dueWeeklyDigestOf>
  try {
    const weeks = digestWeeksOf(deps.db, nowMs).map(({ fromMs, toMs }) => ({
      startsAtMs: fromMs,
      endsAtMs: toMs,
    }))
    due = dueWeeklyDigestOf({ weeks, nowMs, timeZone: deps.timeZone })
  } catch (error) {
    deps.log.error(`notices: could not read the weeks of the digest: ${messageOf(error)}`)
    return
  }
  if (!due) return
  const week = { startsAtMs: due.weekStartsAtMs, endsAtMs: due.weekEndsAtMs }
  for (const channel of channels) {
    await deliverClaimed(
      deps,
      {
        noticeKey: due.key,
        kind: 'weekly_digest',
        channel: channel.name,
        letter: null,
        muscleGroupSlugs: null,
        dueAt: new Date(due.dueAtMs).toISOString(),
        eventAt: new Date(due.weekEndsAtMs).toISOString(),
      },
      now,
      () => channel.deliverDigest(weeklyDigestFor(deps.db, week, nowMs), nowMs),
    )
  }
}

export async function runNoticeTick(deps: NoticeTickDeps): Promise<void> {
  const now = deps.now()
  let notices: Notice[]
  try {
    notices = dueNoticesOf(loadNoticesInput(deps.db, now, deps.timeZone))
  } catch (error) {
    deps.log.error(`notices: could not read the windows and levels: ${messageOf(error)}`)
    return
  }
  for (const notice of notices) {
    for (const channel of deps.channels) {
      await deliverOnce(deps, channel, notice, now)
    }
  }
  await deliverWeeklyDigest(deps, now)
}

export type RunningNoticeScheduler = { stop: () => Promise<void> }

// Nothing stays in memory between ticks but the tick in progress, so a restart loses no notice
// that is still due (ADR-036).
export function startNoticeScheduler(
  deps: NoticeTickDeps & { intervalMs?: number },
): RunningNoticeScheduler {
  let running: Promise<void> | null = null
  const tick = () => {
    if (running) return
    running = runNoticeTick(deps)
      .catch((error) => deps.log.error(`notices: tick failed: ${messageOf(error)}`))
      .finally(() => {
        running = null
      })
  }
  const timer = setInterval(tick, deps.intervalMs ?? NOTICE_INTERVAL_MS)
  tick()
  return {
    async stop() {
      clearInterval(timer)
      await running
    },
  }
}
