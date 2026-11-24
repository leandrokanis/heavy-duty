import type { GroupProgress } from './level.rules.ts'

export type OverallLevel = { level: number; muscleGroupSlug: string }

// Decisions D29 and D67: the lowest level among the groups the program trains, with the group
// that limits it; a tie goes to the emptier bar, then to the group listed first, in catalog order.
export function overallLevelOf(
  levels: readonly { slug: string; progress: GroupProgress }[],
  programGroupSlugs: ReadonlySet<string>,
): OverallLevel | null {
  let weakest: { slug: string; progress: GroupProgress } | null = null
  for (const group of levels) {
    if (!programGroupSlugs.has(group.slug)) continue
    const { level, points } = group.progress
    if (
      weakest === null ||
      level < weakest.progress.level ||
      (level === weakest.progress.level && points < weakest.progress.points)
    ) {
      weakest = group
    }
  }
  return weakest && { level: weakest.progress.level, muscleGroupSlug: weakest.slug }
}

// A letter of the program, with the planned sets of each exercise and its primary groups.
export type PlannedDay = {
  letter: string
  exercises: readonly { sets: number; muscleGroupSlugs: readonly string[] }[]
}

// Decision D68: the letter with the most planned sets of the group, the first in the program on a
// tie; null when no letter trains it.
export function letterForGroupOf(days: readonly PlannedDay[], slug: string): string | null {
  let best: { letter: string; sets: number } | null = null
  for (const { letter, exercises } of days) {
    const sets = exercises
      .filter(({ muscleGroupSlugs }) => muscleGroupSlugs.includes(slug))
      .reduce((total, exercise) => total + exercise.sets, 0)
    if (sets > 0 && (best === null || sets > best.sets)) best = { letter, sets }
  }
  return best?.letter ?? null
}
