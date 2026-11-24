import { letterForGroupOf, overallLevelOf, type PlannedDay, tierOf } from '@heavy-duty/game'
import type { MuscleGroupLevels, Tier } from './levels.types'
import { muscleGroupsOfDay } from './muscle-groups-of-day'
import type { MuscleGroupRef, Today, TodayDay } from './today.types'
import { windowBadgesOf } from './window-badges'
import type { ActivityWindows } from './windows.types'

// Where a tap on the overall level leads: the letter that trains the group the most, or, with the
// group resting, the instant its window opens (D39, D68).
export type OverallLevelTarget =
  | { kind: 'letter'; day: TodayDay }
  | { kind: 'resting'; opensAtMs: number }

export type OverallLevelView = {
  level: number
  tier: Tier
  group: MuscleGroupRef
  target: OverallLevelTarget
}

function plannedDayOf(day: TodayDay): PlannedDay {
  return {
    letter: day.letter,
    exercises: day.exercises.map(({ sets, muscleGroups }) => ({
      sets,
      muscleGroupSlugs: (muscleGroups ?? []).map(({ slug }) => slug),
    })),
  }
}

// A final value on the phone, from the copies of the workout of the day, the levels and the
// windows, with the clock of the device (ADR-034, addendum of wave 6b). Null with no level known.
export function overallLevelViewOf(
  today: Today,
  levels: MuscleGroupLevels | null,
  windows: ActivityWindows | null,
  nowMs: number,
): OverallLevelView | null {
  if (levels === null) return null
  const programGroups = new Set(
    today.days.flatMap((day) => muscleGroupsOfDay(day).map(({ slug }) => slug)),
  )
  const overall = overallLevelOf(
    levels.groups.map(({ muscleGroup, level, points, bestLevel }) => ({
      slug: muscleGroup.slug,
      progress: { level, points, bestLevel },
    })),
    programGroups,
  )
  if (overall === null) return null
  const group = levels.groups.find(
    ({ muscleGroup }) => muscleGroup.slug === overall.muscleGroupSlug,
  )?.muscleGroup as MuscleGroupRef
  const view = { level: overall.level, tier: tierOf(overall.level), group }
  const [badge] = windows ? windowBadgesOf([group], windows, nowMs) : []
  if (badge?.state === 'resting') {
    return { ...view, target: { kind: 'resting', opensAtMs: badge.atMs } }
  }
  const letter = letterForGroupOf(today.days.map(plannedDayOf), group.slug)
  const day = today.days.find((listed) => listed.letter === letter) as TodayDay
  return { ...view, target: { kind: 'letter', day } }
}
