import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { DomainError } from '../../errors/domain-error.js'
import { gameReplayOf } from '../windows/progress.rules.js'
import { loadProgressSets } from '../windows/progress.service.js'
import { findWeeklyGoalBefore } from '../windows/weekly-goal.repository.js'
import { type GroupTraining, groupTrainingsOf } from '../windows/window.rules.js'
import { GAME_PARAMETERS } from '../windows/windows.config.js'
import { listMuscleGroups, listWorkoutSets } from '../windows/windows.repository.js'
import { windowsUsedByWeek } from '../windows/windows-used.rules.js'
import {
  findPeriod,
  insertPeriod,
  listWorkoutsStartedBetween,
  type PeriodRow,
  updatePeriodIntention,
} from './period.repository.js'
import { firstPeriodStartOf, periodAt, periodNumbered, weekOfPeriod } from './period.rules.js'
import { periodVolumeOf, periodWindowsOf, type WindowsTally } from './period-stats.rules.js'
import {
  MAX_INTENTION_LENGTH,
  PERIOD_WEEKS,
  WEEK_MS,
  WEEKLY_VOLUME_TARGET_PERCENT,
  WINDOWS_USED_TARGET_PERCENT,
} from './periods.config.js'
import type { CurrentPeriod, PeriodIntentionInput } from './periods.schemas.js'
import { periodRankingOf, pointsStartedBetween, type RankedWorkout } from './ranking.rules.js'
import { type StreakWeek, type WeekStatus, weekStreakOf } from './week-streak.rules.js'

const iso = (instantMs: number) => new Date(instantMs).toISOString()
const NO_WINDOWS: WindowsTally = { windowsUsed: 0, windowsMissed: 0, usedPercent: null }

// The first call stores period 1 from the Monday of its week; later calls add the periods up to
// the current one, also the ones that passed with the server stopped (ADR-039).
export function ensurePeriods(db: Database, now: Date, timeZone: string): PeriodRow {
  const nowMs = now.getTime()
  const first = findPeriod(db, 1)
  const firstStartMs = first ? Date.parse(first.startsAt) : firstPeriodStartOf(nowMs, timeZone)
  const current = periodAt(firstStartMs, nowMs)
  for (let number = 1; number <= current.number; number += 1) {
    if (number === 1 ? first : findPeriod(db, number)) continue
    const bounds = periodNumbered(firstStartMs, number)
    insertPeriod(db, {
      id: createId(nowMs),
      number,
      startsAt: iso(bounds.startsAtMs),
      endsAt: iso(bounds.endsAtMs),
    })
  }
  return findPeriod(db, current.number) as PeriodRow
}

// Levels cross the periods (D24); only the goals and the progress in the period start over.
export function getCurrentPeriod(db: Database, now: Date, timeZone: string): CurrentPeriod {
  const period = ensurePeriods(db, now, timeZone)
  const nowMs = now.getTime()
  const startsAtMs = Date.parse(period.startsAt)
  const sets = listWorkoutSets(db).map(({ performedAt, ...set }) => ({
    ...set,
    performedAtMs: Date.parse(performedAt),
  }))
  const trainingsOfGroups = groupTrainingsOf(sets, GAME_PARAMETERS)
  const windows = periodWindowsOf({
    trainingsOfGroups,
    parameters: GAME_PARAMETERS,
    startsAtMs,
    nowMs,
  })
  const { setPoints } = gameReplayOf(loadProgressSets(db), GAME_PARAMETERS, nowMs)
  const ranking = periodRankingOf({
    workouts: listWorkoutsStartedBetween(db, period.startsAt, period.endsAt),
    setPoints,
    startsAtMs,
    endsAtMs: Date.parse(period.endsAt),
  })
  return {
    now: now.toISOString(),
    number: period.number,
    startsAt: period.startsAt,
    endsAt: period.endsAt,
    week: weekOfPeriod(startsAtMs, nowMs),
    weekCount: PERIOD_WEEKS,
    intention: period.intention,
    windows: { ...windows.total, targetPercent: WINDOWS_USED_TARGET_PERCENT },
    volume: {
      ...periodVolumeOf({ sets, parameters: GAME_PARAMETERS, startsAtMs, nowMs }),
      targetPercent: WEEKLY_VOLUME_TARGET_PERCENT,
    },
    groups: listMuscleGroups(db).map((muscleGroup) => ({
      muscleGroup,
      ...(windows.byGroup.get(muscleGroup.slug) ?? NO_WINDOWS),
    })),
    ...streakOf(db, trainingsOfGroups, period, ranking, nowMs),
    ranking,
  }
}

export type CountedWeek = StreakWeek & { fromMs: number; toMs: number }

// The weeks from period 1 with the windows used and the goal of each (D75, D101), for the streak.
export function weeksSinceFirstPeriod(
  db: Database,
  trainingsOfGroups: Map<string, GroupTraining[]>,
  weekCount: number,
  nowMs: number,
): CountedWeek[] {
  const firstStartMs = Date.parse((findPeriod(db, 1) as PeriodRow).startsAt)
  return windowsUsedByWeek({
    trainingsOfGroups: trainingsOfGroups.values(),
    parameters: GAME_PARAMETERS,
    fromMs: firstStartMs,
    weekCount,
    nowMs,
  }).map(({ fromMs, toMs, windowsUsed }) => ({
    fromMs,
    toMs,
    periodNumber: periodAt(firstStartMs, fromMs).number,
    weeklyGoal: findWeeklyGoalBefore(db, iso(toMs)),
    windowsUsed,
    finished: toMs <= nowMs,
  }))
}

// Every week from period 1 to the week of now, with its status in the streak (D101).
export function weeksUntilNowOf(
  db: Database,
  trainingsOfGroups: Map<string, GroupTraining[]>,
  nowMs: number,
): (CountedWeek & { status: WeekStatus })[] {
  const firstStartMs = Date.parse((findPeriod(db, 1) as PeriodRow).startsAt)
  const weekCount = Math.max(1, Math.floor((nowMs - firstStartMs) / WEEK_MS) + 1)
  const weeks = weeksSinceFirstPeriod(db, trainingsOfGroups, weekCount, nowMs)
  const { statuses } = weekStreakOf(weeks)
  return weeks.map((week, index) => ({ ...week, status: statuses[index] as WeekStatus }))
}

// The streak replays every week from period 1, so it crosses the periods (D101); the answer
// lists the weeks of the current period up to the week of now.
function streakOf(
  db: Database,
  trainingsOfGroups: Map<string, GroupTraining[]>,
  period: PeriodRow,
  ranking: RankedWorkout[],
  nowMs: number,
): Pick<CurrentPeriod, 'weeks' | 'weekStreak'> {
  const firstStartMs = Date.parse((findPeriod(db, 1) as PeriodRow).startsAt)
  const weekCount = Math.max(1, Math.floor((nowMs - firstStartMs) / WEEK_MS) + 1)
  const weeks = weeksSinceFirstPeriod(db, trainingsOfGroups, weekCount, nowMs)
  const streak = weekStreakOf(weeks)
  const periodStartMs = Date.parse(period.startsAt)
  return {
    weeks: weeks.flatMap(({ fromMs, toMs, weeklyGoal, windowsUsed, periodNumber }, index) =>
      periodNumber === period.number
        ? [
            {
              week: Math.floor((fromMs - periodStartMs) / WEEK_MS) + 1,
              from: iso(fromMs),
              to: iso(toMs),
              weeklyGoal,
              windowsUsed,
              points: pointsStartedBetween(ranking, fromMs, toMs),
              status: streak.statuses[index] as WeekStatus,
            },
          ]
        : [],
    ),
    weekStreak: { weeks: streak.weeks, protectionUsed: streak.protectionUsed },
  }
}

// Optional and editable until the end of the period; an empty text removes it (D98).
export function setPeriodIntention(
  db: Database,
  input: PeriodIntentionInput,
  now: Date,
  timeZone: string,
): CurrentPeriod {
  if (typeof input.intention !== 'string') {
    throw new DomainError('period_intention_required', 'informe a frase de intenção', 'invalid')
  }
  const intention = input.intention.replace(/\s+/g, ' ').trim()
  if ([...intention].length > MAX_INTENTION_LENGTH) {
    throw new DomainError(
      'period_intention_too_long',
      'a frase de intenção deve ter até 120 caracteres',
      'invalid',
    )
  }
  const period = ensurePeriods(db, now, timeZone)
  updatePeriodIntention(db, period.number, intention === '' ? null : intention)
  return getCurrentPeriod(db, now, timeZone)
}
