import { suggestLetterByWindows, type WindowBounds } from '@heavy-duty/game'
import { muscleGroupsOfDay } from '@/shared/muscle-groups-of-day'
import type { MuscleGroupLevels } from './levels.types'
import type { Today } from './today.types'
import type { ActivityWindows } from './windows.types'

// Final on the phone, not provisional (ADR-034): it follows the clock with the copies of the
// workout of the day, the windows and the levels. The API suggestion is the program sequence.
export function suggestedLetterOf(
  today: Today,
  windows: ActivityWindows | null,
  levels: MuscleGroupLevels | null,
  nowMs: number,
): string | null {
  const windowsBySlug: Record<string, WindowBounds> = {}
  for (const group of windows?.groups ?? []) windowsBySlug[group.muscleGroup.slug] = group
  const levelsBySlug: Record<string, number> = {}
  for (const group of levels?.groups ?? []) levelsBySlug[group.muscleGroup.slug] = group.level
  return suggestLetterByWindows({
    days: today.days.map((day) => ({
      letter: day.letter,
      groupSlugs: muscleGroupsOfDay(day).map((group) => group.slug),
    })),
    windows: windowsBySlug,
    levels: levelsBySlug,
    rotationLetter: today.suggestedLetter,
    nowMs,
  })
}
