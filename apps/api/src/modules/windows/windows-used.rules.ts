import { type GroupTraining, simulateGroupWindows } from './window.rules.js'
import type { GameParameters } from './windows.config.js'

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export type WeekWindows = {
  fromMs: number
  toMs: number
  windowsUsed: number
  windowsMissed: number
  windowsOpen: number
  usedPercent: number | null
}

type Tally = 'windowsUsed' | 'windowsMissed' | 'windowsOpen'

// A window counts in the week of its outcome: used at the next training of the group, missed at
// its close, open at now. Replaced and pending windows have no outcome to count.
export function windowsUsedByWeek(input: {
  trainingsOfGroups: Iterable<GroupTraining[]>
  parameters: GameParameters
  fromMs: number
  weekCount: number
  nowMs: number
}): WeekWindows[] {
  const { fromMs, weekCount, nowMs } = input
  const weeks = Array.from({ length: weekCount }, (_, index) => ({
    fromMs: fromMs + index * WEEK_MS,
    toMs: fromMs + (index + 1) * WEEK_MS,
    windowsUsed: 0,
    windowsMissed: 0,
    windowsOpen: 0,
  }))
  const tally = (instantMs: number, key: Tally) => {
    const week = weeks[Math.floor((instantMs - fromMs) / WEEK_MS)]
    if (week && instantMs >= fromMs) {
      week[key] += 1
    }
  }
  for (const trainings of input.trainingsOfGroups) {
    const simulated = simulateGroupWindows(trainings, input.parameters, nowMs).trainings
    simulated.forEach((training, index) => {
      if (training.outcome === 'used') {
        tally((trainings[index + 1] as GroupTraining).trainedAtMs, 'windowsUsed')
      } else if (training.outcome === 'missed') {
        tally(training.closesAtMs, 'windowsMissed')
      } else if (training.outcome === 'open') {
        tally(nowMs, 'windowsOpen')
      }
    })
  }
  return weeks.map((week) => {
    const finished = week.windowsUsed + week.windowsMissed
    return {
      ...week,
      usedPercent: finished === 0 ? null : Math.round((week.windowsUsed * 100) / finished),
    }
  })
}
