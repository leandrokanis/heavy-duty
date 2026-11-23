import { type VolumeSet, volumeByMuscleGroup } from './volume.rules.js'
import type { GameParameters, Goal } from './windows.config.js'

const HOUR_MS = 60 * 60 * 1000

export type GroupTraining = {
  workoutId: string
  letter: string
  trainedAtMs: number
  goal: Goal
  volumeG: number
}

export type WindowSet = VolumeSet & {
  workoutId: string
  letter: string
  goal: Goal
  performedAtMs: number
}

export type ActivityWindow = { adjustedVolumeG: number; opensAtMs: number; closesAtMs: number }

export function windowOf(
  training: Pick<GroupTraining, 'trainedAtMs' | 'goal' | 'volumeG'>,
  parameters: GameParameters,
): ActivityWindow {
  const adjustedVolumeG = Math.floor(
    (training.volumeG * parameters.goalVolumePercent[training.goal]) / 100,
  )
  const volumeOpenSeconds = Math.floor(
    (adjustedVolumeG * parameters.openMinutesPerAdjustedKg * 60) / 1000,
  )
  const openMs = Math.min(
    parameters.baseOpenHours[training.goal] * HOUR_MS + volumeOpenSeconds * 1000,
    parameters.maxOpenHours * HOUR_MS,
  )
  const opensAtMs = training.trainedAtMs + openMs
  return {
    adjustedVolumeG,
    opensAtMs,
    closesAtMs: training.trainedAtMs + parameters.closeAfterHours[training.goal] * HOUR_MS,
  }
}

export type WindowState = 'resting' | 'open' | 'cooling' | 'none'

const STATE_OF_POSITION = { early: 'resting', in_window: 'open', late: 'cooling' } as const

export function windowStateOf(
  lastTraining: Pick<GroupTraining, 'trainedAtMs' | 'goal' | 'volumeG'> | undefined,
  parameters: GameParameters,
  nowMs: number,
): WindowState {
  if (!lastTraining) {
    return 'none'
  }
  return STATE_OF_POSITION[positionIn(windowOf(lastTraining, parameters), nowMs)]
}

// A group is trained by a set where it is a primary or a secondary muscle, at the last such set.
export function groupTrainingsOf(
  sets: WindowSet[],
  parameters: GameParameters,
): Map<string, GroupTraining[]> {
  const setsOfWorkout = new Map<string, WindowSet[]>()
  for (const set of sets) {
    setsOfWorkout.set(set.workoutId, [...(setsOfWorkout.get(set.workoutId) ?? []), set])
  }
  const trainings = new Map<string, GroupTraining[]>()
  for (const [workoutId, workoutSets] of setsOfWorkout) {
    const volumes = volumeByMuscleGroup(workoutSets, parameters)
    const lastSetMs = new Map<string, number>()
    for (const set of workoutSets) {
      for (const slug of [...set.primaryGroupSlugs, ...set.secondaryGroupSlugs]) {
        lastSetMs.set(slug, Math.max(lastSetMs.get(slug) ?? 0, set.performedAtMs))
      }
    }
    const { letter, goal } = workoutSets[0] as WindowSet
    for (const [slug, trainedAtMs] of lastSetMs) {
      const list = trainings.get(slug) ?? []
      list.push({ workoutId, letter, trainedAtMs, goal, volumeG: volumes.get(slug)?.volumeG ?? 0 })
      trainings.set(slug, list)
    }
  }
  for (const list of trainings.values()) {
    list.sort(
      (a, b) =>
        a.trainedAtMs - b.trainedAtMs ||
        (a.workoutId < b.workoutId ? -1 : a.workoutId > b.workoutId ? 1 : 0),
    )
  }
  return trainings
}

export type WindowRelation = 'first' | 'early' | 'in_window' | 'late'
export type WindowOutcome = 'used' | 'replaced' | 'missed' | 'open' | 'pending'

export type SimulatedTraining = GroupTraining &
  ActivityWindow & { relation: WindowRelation; outcome: WindowOutcome }

// The window is half open: it is open at opensAtMs and already closed at closesAtMs.
function positionIn(window: ActivityWindow, instantMs: number): 'early' | 'in_window' | 'late' {
  if (instantMs < window.opensAtMs) {
    return 'early'
  }
  return instantMs < window.closesAtMs ? 'in_window' : 'late'
}

const OUTCOME_OF_POSITION = { early: 'replaced', in_window: 'used', late: 'missed' } as const
const OUTCOME_OF_NOW = { early: 'pending', in_window: 'open', late: 'missed' } as const

export function simulateGroupWindows(
  trainings: GroupTraining[],
  parameters: GameParameters,
  nowMs: number,
): { trainings: SimulatedTraining[]; summary: WindowSummary } {
  const windows = trainings.map((training) => windowOf(training, parameters))
  const simulated = trainings.map((training, index): SimulatedTraining => {
    const previous = windows[index - 1]
    const next = trainings[index + 1]
    const window = windows[index] as ActivityWindow
    return {
      ...training,
      ...window,
      relation: previous ? positionIn(previous, training.trainedAtMs) : 'first',
      outcome: next
        ? OUTCOME_OF_POSITION[positionIn(window, next.trainedAtMs)]
        : OUTCOME_OF_NOW[positionIn(window, nowMs)],
    }
  })
  return { trainings: simulated, summary: summarizeWindows(simulated) }
}

export type WindowSummary = {
  windowsUsed: number
  windowsMissed: number
  trainedEarly: number
  usedPercent: number | null
}

export function summarizeWindows(trainings: SimulatedTraining[]): WindowSummary {
  const count = (outcome: WindowOutcome) =>
    trainings.filter((training) => training.outcome === outcome).length
  const windowsUsed = count('used')
  const windowsMissed = count('missed')
  const finished = windowsUsed + windowsMissed
  return {
    windowsUsed,
    windowsMissed,
    trainedEarly: count('replaced'),
    usedPercent: finished === 0 ? null : Math.round((windowsUsed * 100) / finished),
  }
}
