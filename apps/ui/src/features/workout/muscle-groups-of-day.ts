import type { MuscleGroupRef, TodayDay } from './today.types'

export function muscleGroupsOfDay(day: TodayDay): MuscleGroupRef[] {
  const bySlug = new Map<string, MuscleGroupRef>()
  for (const exercise of day.exercises) {
    // A copy of the day saved on the device before this field existed has no groups.
    for (const group of exercise.muscleGroups ?? []) {
      if (!bySlug.has(group.slug)) bySlug.set(group.slug, group)
    }
  }
  return [...bySlug.values()]
}
