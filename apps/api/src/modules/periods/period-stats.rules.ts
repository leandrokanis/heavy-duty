import { type VolumeSet, volumeByMuscleGroup } from '../windows/volume.rules.js'
import type { GroupTraining } from '../windows/window.rules.js'
import type { GameParameters } from '../windows/windows.config.js'
import { windowsUsedByWeek } from '../windows/windows-used.rules.js'
import { PERIOD_WEEKS, WEEK_MS } from './periods.config.js'

export type WindowsTally = {
  windowsUsed: number
  windowsMissed: number
  usedPercent: number | null
}

export type PeriodWindows = { total: WindowsTally; byGroup: Map<string, WindowsTally> }

export function tallyOf(windowsUsed: number, windowsMissed: number): WindowsTally {
  const finished = windowsUsed + windowsMissed
  return {
    windowsUsed,
    windowsMissed,
    usedPercent: finished === 0 ? null : Math.round((windowsUsed * 100) / finished),
  }
}

// O1 of the period and the progress of each group in it (D100): the windows used and
// missed in the weeks of the period, with the open ones out of the rate.
export function periodWindowsOf(input: {
  trainingsOfGroups: Map<string, GroupTraining[]>
  parameters: GameParameters
  startsAtMs: number
  nowMs: number
}): PeriodWindows {
  const byGroup = new Map<string, WindowsTally>()
  let used = 0
  let missed = 0
  for (const [slug, trainings] of input.trainingsOfGroups) {
    const weeks = windowsUsedByWeek({
      trainingsOfGroups: [trainings],
      parameters: input.parameters,
      fromMs: input.startsAtMs,
      weekCount: PERIOD_WEEKS,
      nowMs: input.nowMs,
    })
    const groupUsed = weeks.reduce((sum, week) => sum + week.windowsUsed, 0)
    const groupMissed = weeks.reduce((sum, week) => sum + week.windowsMissed, 0)
    byGroup.set(slug, tallyOf(groupUsed, groupMissed))
    used += groupUsed
    missed += groupMissed
  }
  return { total: tallyOf(used, missed), byGroup }
}

export type PeriodVolume = {
  baselineVolumeG: number | null
  lastWeekVolumeG: number | null
  changePercent: number | null
}

// O4 of the period: the total volume of the last complete week against week 1, the baseline of
// the PRD; time exercises stay out of the volume (D46).
export function periodVolumeOf(input: {
  sets: (VolumeSet & { performedAtMs: number })[]
  parameters: GameParameters
  startsAtMs: number
  nowMs: number
}): PeriodVolume {
  const lastWeek = Math.min(PERIOD_WEEKS, Math.floor((input.nowMs - input.startsAtMs) / WEEK_MS))
  if (lastWeek < 1) {
    return { baselineVolumeG: null, lastWeekVolumeG: null, changePercent: null }
  }
  const volumeOfWeek = (week: number) => {
    const fromMs = input.startsAtMs + (week - 1) * WEEK_MS
    const sets = input.sets.filter(
      ({ performedAtMs }) => performedAtMs >= fromMs && performedAtMs < fromMs + WEEK_MS,
    )
    let total = 0
    for (const { volumeG } of volumeByMuscleGroup(sets, input.parameters).values()) total += volumeG
    return total
  }
  const baselineVolumeG = volumeOfWeek(1)
  const lastWeekVolumeG = volumeOfWeek(lastWeek)
  return {
    baselineVolumeG,
    lastWeekVolumeG,
    changePercent:
      baselineVolumeG === 0
        ? null
        : Math.round(((lastWeekVolumeG - baselineVolumeG) * 100) / baselineVolumeG),
  }
}
