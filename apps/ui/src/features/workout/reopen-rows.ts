import { muscleGroupsOfDay } from './muscle-groups-of-day'
import type { TodayDay } from './today.types'
import type { ActivityWindows } from './windows.types'
import type { RecordWorkoutSetBody } from './workout-set.types'

export type ReopenRow = { slug: string; name: string; opensAtMs: number }

export type ReopenRowsInput = {
  day: TodayDay
  recorded: RecordWorkoutSetBody[]
  windows: ActivityWindows
  workoutStartMs: number
}

// The primary groups of the exercises with a set recorded, in the order of the letter, whose
// window comes from this workout (FR-1, FR-3).
export function reopenRowsOf({
  day,
  recorded,
  windows,
  workoutStartMs,
}: ReopenRowsInput): ReopenRow[] {
  const doneIds = new Set(recorded.map(({ plannedExerciseId }) => plannedExerciseId))
  const trained = muscleGroupsOfDay({
    ...day,
    exercises: day.exercises.filter(({ plannedExerciseId }) => doneIds.has(plannedExerciseId)),
  })
  return trained.flatMap(({ slug, name }) => {
    const window = windows.groups.find((group) => group.muscleGroup.slug === slug)
    if (!window?.lastTrainedAt || !window.opensAt) return []
    if (Date.parse(window.lastTrainedAt) < workoutStartMs) return []
    return [{ slug, name, opensAtMs: Date.parse(window.opensAt) }]
  })
}
