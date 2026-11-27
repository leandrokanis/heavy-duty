import { tierOf } from '@heavy-duty/game'
import type { Database } from '../../db/connection.js'
import { loadProgressSets } from '../windows/progress.service.js'
import { groupTrainingsOf } from '../windows/window.rules.js'
import { GAME_PARAMETERS } from '../windows/windows.config.js'
import { listMuscleGroups } from '../windows/windows.repository.js'
import { listPeriods, listWorkoutsStartedBetween, type PeriodRow } from './period.repository.js'
import { ensurePeriods, weeksSinceFirstPeriod } from './period.service.js'
import { tallyOf } from './period-stats.rules.js'
import { WEEK_MS } from './periods.config.js'
import type { PeriodList } from './periods.schemas.js'
import { insertSnapshot, listSnapshotGroups } from './snapshot.repository.js'
import { periodSnapshotOf } from './snapshot.rules.js'
import { weekStreakOf } from './week-streak.rules.js'

// Freezes each period that ended with no snapshot, the ones that passed with the server stopped
// too, and returns how many it froze. A frozen period never changes again (ADR-010, ADR-039).
export function freezeEndedPeriods(db: Database, now: Date, timeZone: string): number {
  ensurePeriods(db, now, timeZone)
  const ended = listPeriods(db).filter(
    ({ endsAt, frozenAt }) => frozenAt === null && Date.parse(endsAt) <= now.getTime(),
  )
  if (ended.length === 0) return 0
  const sets = loadProgressSets(db)
  const muscleGroupSlugs = listMuscleGroups(db).map(({ slug }) => slug)
  let frozen = 0
  for (const period of ended) {
    const startsAtMs = Date.parse(period.startsAt)
    const endsAtMs = Date.parse(period.endsAt)
    const { groups, ...summary } = periodSnapshotOf({
      sets,
      parameters: GAME_PARAMETERS,
      startsAtMs,
      endsAtMs,
      workouts: listWorkoutsStartedBetween(db, period.startsAt, period.endsAt),
      muscleGroupSlugs,
    })
    const weekStreak = streakAtEndOf(db, sets, endsAtMs)
    if (
      insertSnapshot(
        db,
        { id: period.id, frozenAt: now.toISOString() },
        { ...summary, weekStreak },
        groups,
      )
    ) {
      frozen += 1
    }
  }
  return frozen
}

// The weeks from period 1 to the end, all finished, with the sets before the end (D99, D101).
function streakAtEndOf(
  db: Database,
  sets: ReturnType<typeof loadProgressSets>,
  endsAtMs: number,
): number {
  const before = sets.filter(({ performedAtMs }) => performedAtMs < endsAtMs)
  const firstStartMs = Date.parse((listPeriods(db)[0] as PeriodRow).startsAt)
  const weekCount = Math.round((endsAtMs - firstStartMs) / WEEK_MS)
  const weeks = weeksSinceFirstPeriod(
    db,
    groupTrainingsOf(before, GAME_PARAMETERS),
    weekCount,
    endsAtMs,
  )
  return weekStreakOf(weeks).weeks
}

// The reading freezes what the scheduler missed, so the list never lacks a snapshot (ADR-039).
export function listPeriodsWithSnapshots(db: Database, now: Date, timeZone: string): PeriodList {
  freezeEndedPeriods(db, now, timeZone)
  return {
    now: now.toISOString(),
    periods: listPeriods(db)
      .reverse()
      .map((period) => ({
        number: period.number,
        startsAt: period.startsAt,
        endsAt: period.endsAt,
        intention: period.intention,
        frozenAt: period.frozenAt,
        snapshot: snapshotOf(db, period),
      })),
  }
}

function snapshotOf(db: Database, period: PeriodRow): PeriodList['periods'][number]['snapshot'] {
  const { windowsUsed, windowsMissed, points, bestWorkoutPoints, weekStreak } = period
  if (
    period.frozenAt === null ||
    windowsUsed === null ||
    windowsMissed === null ||
    points === null ||
    bestWorkoutPoints === null ||
    weekStreak === null
  ) {
    return null
  }
  return {
    ...tallyOf(windowsUsed, windowsMissed),
    points,
    bestWorkoutPoints,
    weekStreak,
    groups: listSnapshotGroups(db, period.id).map((group) => ({
      ...group,
      tier: tierOf(group.level),
      ...tallyOf(group.windowsUsed, group.windowsMissed),
    })),
  }
}
