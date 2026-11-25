import type { PlannedDay } from '@heavy-duty/game'
import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { listMuscleGroupLevels } from '../windows/progress.service.js'
import { listActivityWindows } from '../windows/window-state.service.js'
import { getToday } from '../workouts/today.service.js'
import { pushMessageOf } from './notice-format.js'
import { dueNoticesOf, type Notice, type NoticesInput } from './notices.rules.js'
import { claimNotification, finishNotification } from './notification.repository.js'
import type { PushSender } from './push-sender.js'
import { sendPushToAll } from './push-subscription.service.js'

export const NOTICE_INTERVAL_MS = 60_000

const MAX_ERROR_LENGTH = 500

export type ChannelResult = { status: 'sent' | 'failed' | 'skipped'; error: string | null }

// A channel delivers one notice; the email channel joins the push one in US-F17-01.
export type NoticeChannel = {
  name: 'push' | 'email'
  deliver: (notice: Notice, nowMs: number) => Promise<ChannelResult>
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

async function deliverOnce(
  deps: NoticeTickDeps,
  channel: NoticeChannel,
  notice: Notice,
  now: Date,
): Promise<void> {
  const id = createId(now.getTime())
  const claimed = claimNotification(deps.db, {
    id,
    noticeKey: notice.key,
    kind: notice.kind,
    channel: channel.name,
    letter: notice.letter,
    muscleGroupSlugs: JSON.stringify(notice.groups.map(({ slug }) => slug)),
    dueAt: new Date(notice.dueAtMs).toISOString(),
    eventAt: new Date(notice.eventAtMs).toISOString(),
    createdAt: now.toISOString(),
  })
  if (!claimed) return
  // A channel that throws is recorded as failed, and the next channel still goes (D32).
  const result = await channel.deliver(notice, now.getTime()).catch(
    (error): ChannelResult => ({
      status: 'failed',
      error: `channel failed: ${messageOf(error)}`,
    }),
  )
  finishNotification(deps.db, id, {
    status: result.status,
    error: result.error?.slice(0, MAX_ERROR_LENGTH) ?? null,
    finishedAt: deps.now().toISOString(),
  })
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
