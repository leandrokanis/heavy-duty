import {
  addGroupGain,
  type GroupProgress,
  groupGainOf,
  multiplierPercentOf,
  type SetPlan,
  startingProgress,
} from '@heavy-duty/game'
import { type GroupTraining, groupTrainingsOf, type WindowSet, windowOf } from './window.rules.js'
import type { GameParameters } from './windows.config.js'

// A recorded set with its frozen plan (ADR-033): the plan of the exercise and the planned sets of
// each primary group in the letter, null when the workout lost its letter.
export type ProgressSet = WindowSet & {
  plan: SetPlan | null
  plannedGroupSets: Record<string, number> | null
}

// The training of the group before this workout: the window that doubles the gain (D56).
function previousTrainingOf(
  trainings: GroupTraining[],
  set: ProgressSet,
): GroupTraining | undefined {
  return trainings.findLast(
    (training) => training.workoutId !== set.workoutId && training.trainedAtMs < set.performedAtMs,
  )
}

function isInWindowOfGroup(
  trainings: GroupTraining[],
  set: ProgressSet,
  parameters: GameParameters,
): boolean {
  const previous = previousTrainingOf(trainings, set)
  if (previous === undefined) return false
  const window = windowOf(previous, parameters)
  return window.opensAtMs <= set.performedAtMs && set.performedAtMs < window.closesAtMs
}

function orderOf(a: ProgressSet, b: ProgressSet): number {
  return (
    a.performedAtMs - b.performedAtMs ||
    (a.workoutId < b.workoutId ? -1 : a.workoutId > b.workoutId ? 1 : 0)
  )
}

// Replays the history in time order: each set fills the bar of each group of its exercise with
// the gain of D54, doubled while the group is in the window of its training before (D55). The
// planned sets of a workout with no letter are the sets recorded of the group in it.
export function groupProgressOf(
  sets: ProgressSet[],
  parameters: GameParameters,
): Map<string, GroupProgress> {
  const trainings = groupTrainingsOf(sets, parameters)
  const recordedGroupSets = new Map<string, number>()
  for (const set of sets) {
    for (const slug of new Set(set.primaryGroupSlugs)) {
      const key = `${set.workoutId}:${slug}`
      recordedGroupSets.set(key, (recordedGroupSets.get(key) ?? 0) + 1)
    }
  }
  const progress = new Map<string, GroupProgress>()
  for (const set of [...sets].sort(orderOf)) {
    const primary = new Set(set.primaryGroupSlugs)
    const secondary = [...new Set(set.secondaryGroupSlugs)].filter((slug) => !primary.has(slug))
    const roles = [
      ...[...primary].map((slug) => ({ slug, role: 'primary' as const })),
      ...secondary.map((slug) => ({ slug, role: 'secondary' as const })),
    ]
    for (const { slug, role } of roles) {
      const inWindow = isInWindowOfGroup(trainings.get(slug) ?? [], set, parameters)
      const plannedGroupSets =
        set.plannedGroupSets?.[slug] ?? recordedGroupSets.get(`${set.workoutId}:${slug}`) ?? 1
      const gain = groupGainOf(
        set,
        set.plan,
        { role, plannedGroupSets },
        multiplierPercentOf({ inWindow }),
      )
      progress.set(slug, addGroupGain(progress.get(slug) ?? startingProgress(), gain).progress)
    }
  }
  return progress
}
