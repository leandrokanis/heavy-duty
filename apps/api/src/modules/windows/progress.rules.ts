import {
  addGroupGain,
  coolingLossOf,
  type GroupProgress,
  groupGainOf,
  hasMuscleMemory,
  multiplierPercentOf,
  nextDropAtMsOf,
  type SetPlan,
  startingProgress,
  subtractCoolingLoss,
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

function orderOf(a: ProgressSet, b: ProgressSet): number {
  return (
    a.performedAtMs - b.performedAtMs ||
    (a.workoutId < b.workoutId ? -1 : a.workoutId > b.workoutId ? 1 : 0)
  )
}

// The level of a group now: its bar, whether it cools and when it drops a level.
export type GroupLevelState = {
  progress: GroupProgress
  cooling: boolean
  nextDropAtMs: number | null
}

// Replays the history in time order: each set adds the gain of D54 to each group of its exercise,
// doubled in the window before (D55), back from cooling (D53) or below the best level (D63);
// from the close to the next training or now, the group cools (D58). A workout with no letter
// counts its sets of the group.
export function groupLevelsOf(
  sets: ProgressSet[],
  parameters: GameParameters,
  nowMs: number,
): Map<string, GroupLevelState> {
  const trainings = groupTrainingsOf(sets, parameters)
  const recordedGroupSets = new Map<string, number>()
  for (const set of sets) {
    for (const slug of new Set(set.primaryGroupSlugs)) {
      const key = `${set.workoutId}:${slug}`
      recordedGroupSets.set(key, (recordedGroupSets.get(key) ?? 0) + 1)
    }
  }
  const progress = new Map<string, GroupProgress>()
  const progressOf = (slug: string) => progress.get(slug) ?? startingProgress()
  // The first set of each group in each workout: the cooling ends there, and it says whether the
  // workout is the first one back after the window closed (D53).
  const firstSetMs = new Map<string, number>()
  for (const set of [...sets].sort(orderOf)) {
    const primary = new Set(set.primaryGroupSlugs)
    const secondary = [...new Set(set.secondaryGroupSlugs)].filter((slug) => !primary.has(slug))
    const roles = [
      ...[...primary].map((slug) => ({ slug, role: 'primary' as const })),
      ...secondary.map((slug) => ({ slug, role: 'secondary' as const })),
    ]
    for (const { slug, role } of roles) {
      const previous = previousTrainingOf(trainings.get(slug) ?? [], set)
      const window = previous && windowOf(previous, parameters)
      const key = `${set.workoutId}:${slug}`
      if (!firstSetMs.has(key)) {
        firstSetMs.set(key, set.performedAtMs)
        if (window) {
          const loss = coolingLossOf(set.performedAtMs - window.closesAtMs)
          progress.set(slug, subtractCoolingLoss(progressOf(slug), loss))
        }
      }
      const inWindow =
        window !== undefined &&
        window.opensAtMs <= set.performedAtMs &&
        set.performedAtMs < window.closesAtMs
      // A window that closes during the workout stops doubling (D56).
      const welcomeBack =
        window !== undefined && (firstSetMs.get(key) as number) >= window.closesAtMs
      // Below the best level after the cooling and before the gain, the set doubles whole (D64).
      const muscleMemory = hasMuscleMemory(progressOf(slug))
      const plannedGroupSets = set.plannedGroupSets?.[slug] ?? recordedGroupSets.get(key) ?? 1
      const gain = groupGainOf(
        set,
        set.plan,
        { role, plannedGroupSets },
        multiplierPercentOf({ inWindow, welcomeBack, muscleMemory }),
      )
      progress.set(slug, addGroupGain(progressOf(slug), gain).progress)
    }
  }
  const levels = new Map<string, GroupLevelState>()
  for (const [slug, groupTrainings] of trainings) {
    const last = groupTrainings.at(-1) as GroupTraining
    const { closesAtMs } = windowOf(last, parameters)
    const cooling = nowMs >= closesAtMs
    if (!cooling) {
      levels.set(slug, { progress: progressOf(slug), cooling, nextDropAtMs: null })
      continue
    }
    const loss = coolingLossOf(nowMs - closesAtMs)
    const cooled = subtractCoolingLoss(progressOf(slug), loss)
    levels.set(slug, {
      progress: cooled,
      cooling,
      nextDropAtMs: nextDropAtMsOf(closesAtMs, loss, cooled),
    })
  }
  return levels
}
