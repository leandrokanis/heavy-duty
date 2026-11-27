import { startingProgress } from '@heavy-duty/game'
import { gameReplayOf, type ProgressSet } from '../windows/progress.rules.js'
import { groupTrainingsOf, type WindowState, windowStateOf } from '../windows/window.rules.js'
import type { GameParameters } from '../windows/windows.config.js'
import { periodWindowsOf } from './period-stats.rules.js'
import { periodRankingOf, type RankingWorkout } from './ranking.rules.js'

export type GroupSnapshot = {
  slug: string
  level: number
  points: number
  bestLevel: number
  windowState: WindowState
  windowsUsed: number
  windowsMissed: number
}

export type PeriodSnapshot = {
  groups: GroupSnapshot[]
  windowsUsed: number
  windowsMissed: number
  points: number
  bestWorkoutPoints: number
}

// Decision D99: the state at the end of the period, with the end as the cut instant, so a set
// after it never reaches the snapshot (ADR-039). The level carries the cooling up to the end.
export function periodSnapshotOf(input: {
  sets: ProgressSet[]
  parameters: GameParameters
  startsAtMs: number
  endsAtMs: number
  workouts: RankingWorkout[]
  muscleGroupSlugs: string[]
}): PeriodSnapshot {
  const { parameters, startsAtMs, endsAtMs } = input
  const sets = input.sets.filter(({ performedAtMs }) => performedAtMs < endsAtMs)
  const { levels, setPoints } = gameReplayOf(sets, parameters, endsAtMs)
  const trainingsOfGroups = groupTrainingsOf(sets, parameters)
  const windows = periodWindowsOf({ trainingsOfGroups, parameters, startsAtMs, nowMs: endsAtMs })
  const ranking = periodRankingOf({ workouts: input.workouts, setPoints, startsAtMs, endsAtMs })
  return {
    groups: input.muscleGroupSlugs.map((slug) => {
      const { level, points, bestLevel } = levels.get(slug)?.progress ?? startingProgress()
      const tally = windows.byGroup.get(slug)
      return {
        slug,
        level,
        points,
        bestLevel,
        windowState: windowStateOf(trainingsOfGroups.get(slug)?.at(-1), parameters, endsAtMs),
        windowsUsed: tally?.windowsUsed ?? 0,
        windowsMissed: tally?.windowsMissed ?? 0,
      }
    }),
    windowsUsed: windows.total.windowsUsed,
    windowsMissed: windows.total.windowsMissed,
    points: ranking.reduce((total, { points }) => total + points, 0),
    bestWorkoutPoints: Math.max(0, ...ranking.map(({ points }) => points)),
  }
}
