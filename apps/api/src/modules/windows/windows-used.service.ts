import type { Database } from '../../db/connection.js'
import { DomainError } from '../../errors/domain-error.js'
import { MAX_WORKOUT_RANGE_DAYS, parseUtcRange } from '../workouts/utc-range.js'
import { groupTrainingsOf } from './window.rules.js'
import { GAME_PARAMETERS } from './windows.config.js'
import { listWorkoutSets } from './windows.repository.js'
import type { WindowsUsed, WindowsUsedQuery } from './windows.schemas.js'
import { WEEK_MS, windowsUsedByWeek } from './windows-used.rules.js'

const iso = (instantMs: number) => new Date(instantMs).toISOString()

export function getWindowsUsed(db: Database, query: WindowsUsedQuery, now: Date): WindowsUsed {
  const range = parseUtcRange(query, MAX_WORKOUT_RANGE_DAYS)
  const fromMs = Date.parse(range.from)
  const rangeMs = Date.parse(range.to) - fromMs
  if (rangeMs % WEEK_MS !== 0) {
    throw new DomainError(
      'windows_range_not_whole_weeks',
      'o intervalo deve ter semanas inteiras, de 7 dias cada',
      'invalid',
    )
  }
  const trainingsOfGroup = groupTrainingsOf(
    listWorkoutSets(db).map(({ performedAt, ...set }) => ({
      ...set,
      performedAtMs: Date.parse(performedAt),
    })),
    GAME_PARAMETERS,
  )
  const weeks = windowsUsedByWeek({
    trainingsOfGroups: trainingsOfGroup.values(),
    parameters: GAME_PARAMETERS,
    fromMs,
    weekCount: rangeMs / WEEK_MS,
    nowMs: now.getTime(),
  })
  return {
    now: now.toISOString(),
    from: range.from,
    to: range.to,
    weeks: weeks.map(({ fromMs: weekFromMs, toMs, ...count }) => ({
      from: iso(weekFromMs),
      to: iso(toMs),
      ...count,
    })),
  }
}
