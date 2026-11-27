import { personalRecordFlags } from '@heavy-duty/game'
import type { LevelStep } from '../windows/progress.rules.js'
import { volumeByMuscleGroup } from '../windows/volume.rules.js'
import {
  type GroupTraining,
  groupTrainingsOf,
  simulateGroupWindows,
  type WindowSet,
} from '../windows/window.rules.js'
import type { GameParameters } from '../windows/windows.config.js'
import { MEDAL_CATALOG, MEDAL_THRESHOLDS, type MedalCode } from './medals.catalog.js'

const HOUR_MS = 60 * 60 * 1000
const WEEK_MS = 7 * 24 * HOUR_MS

export type MedalSet = WindowSet & { exerciseId: string }

export type MedalWorkout = { id: string; programId: string; letter: string; startedAtMs: number }

export type MedalPeriod = { number: number; startsAtMs: number; endsAtMs: number }

// A week of the periods with its weekly goal (D75) and the streak at its end, or now for the
// current week, counting the week when it met the goal.
export type MedalWeek = {
  startsAtMs: number
  endsAtMs: number
  weeklyGoal: number | null
  weekStreak: number
}

export type { LevelStep }

export type MedalHistory = {
  sets: MedalSet[]
  workouts: MedalWorkout[]
  levelSteps: LevelStep[]
  // From period 1 to the current one, in order.
  periods: MedalPeriod[]
  // From the first week of period 1 to the current one, in order.
  weeks: MedalWeek[]
  activeProgram: { id: string; letters: string[] } | null
  parameters: GameParameters
  nowMs: number
}

export type MedalAward = {
  code: MedalCode
  awardedAtMs: number
  workoutId: string | null
  subject: string | null
}

type MedalEvent = { atMs: number; workoutId: string | null; subject?: string }

// A training of the group inside the window of the training before it.
type UsedWindow = { atMs: number; workoutId: string; closesAtMs: number }

function bySetOrder(a: { performedAtMs: number; workoutId: string }, b: typeof a): number {
  return (
    a.performedAtMs - b.performedAtMs ||
    (a.workoutId < b.workoutId ? -1 : a.workoutId > b.workoutId ? 1 : 0)
  )
}

function earliest(events: Iterable<MedalEvent | undefined>): MedalEvent | undefined {
  let first: MedalEvent | undefined
  for (const event of events) {
    if (event && (!first || event.atMs < first.atMs)) {
      first = event
    }
  }
  return first
}

function firstRecordOf(sets: MedalSet[], gameStartsAtMs: number): MedalEvent | undefined {
  const setsOfExercise = new Map<string, MedalSet[]>()
  for (const set of [...sets].sort(bySetOrder)) {
    setsOfExercise.set(set.exerciseId, [...(setsOfExercise.get(set.exerciseId) ?? []), set])
  }
  return earliest(
    [...setsOfExercise.values()].map((exerciseSets) => {
      const flags = personalRecordFlags([], exerciseSets)
      const record = exerciseSets.find(
        (set, index) => flags[index] && set.performedAtMs >= gameStartsAtMs,
      )
      return record && { atMs: record.performedAtMs, workoutId: record.workoutId }
    }),
  )
}

function usedWindowsOf(history: MedalHistory): UsedWindow[] {
  const used: UsedWindow[] = []
  for (const trainings of groupTrainingsOf(history.sets, history.parameters).values()) {
    const simulated = simulateGroupWindows(trainings, history.parameters, history.nowMs).trainings
    simulated.forEach((training, index) => {
      if (training.outcome === 'used') {
        const next = trainings[index + 1] as GroupTraining
        used.push({
          atMs: next.trainedAtMs,
          workoutId: next.workoutId,
          closesAtMs: training.closesAtMs,
        })
      }
    })
  }
  return used.sort((a, b) => a.atMs - b.atMs)
}

function levelOf(steps: LevelStep[], level: number, gameStartsAtMs: number) {
  const step = [...steps]
    .sort(bySetOrder)
    .find((item) => item.performedAtMs >= gameStartsAtMs && item.level >= level)
  return step && { atMs: step.performedAtMs, workoutId: step.workoutId, subject: step.groupSlug }
}

// The used window that reached the goal of each week with a goal.
function weeksMetOf(weeks: MedalWeek[], used: UsedWindow[]) {
  return weeks.flatMap((week) => {
    const inWeek = used.filter(({ atMs }) => week.startsAtMs <= atMs && atMs < week.endsAtMs)
    const reached = week.weeklyGoal === null ? undefined : inWeek[week.weeklyGoal - 1]
    return reached ? [{ week, event: { atMs: reached.atMs, workoutId: reached.workoutId } }] : []
  })
}

function setVolumeGOf(set: MedalSet, parameters: GameParameters): number {
  let volumeG = 0
  for (const volume of volumeByMuscleGroup([set], parameters).values()) {
    volumeG += volume.volumeG
  }
  return volumeG
}

// The week of a period an instant falls in, from 0; -1 outside the period.
function weekIndexOf(period: MedalPeriod, atMs: number): number {
  return atMs < period.startsAtMs || atMs >= period.endsAtMs
    ? -1
    : Math.floor((atMs - period.startsAtMs) / WEEK_MS)
}

// Each set sits in the week of its instant, as the weekly volume of O4 (period-stats.rules.ts).
function volumeUpOf(history: MedalHistory) {
  const ordered = [...history.sets].sort(bySetOrder)
  return earliest(
    history.periods.map((period) => {
      const totals = new Map<number, number>()
      const volumes = ordered.flatMap((set) => {
        const week = weekIndexOf(period, set.performedAtMs)
        return week < 0 ? [] : [{ set, week, volumeG: setVolumeGOf(set, history.parameters) }]
      })
      const baselineG = volumes
        .filter(({ week }) => week === 0)
        .reduce((sum, { volumeG }) => sum + volumeG, 0)
      if (baselineG === 0) {
        return undefined
      }
      for (const { set, week, volumeG } of volumes.filter(({ week }) => week > 0)) {
        const totalG = (totals.get(week) ?? 0) + volumeG
        totals.set(week, totalG)
        if (totalG * 100 >= baselineG * MEDAL_THRESHOLDS.volumePercentOverFirstWeek) {
          return { atMs: set.performedAtMs, workoutId: set.workoutId }
        }
      }
      return undefined
    }),
  )
}

function fullPeriodOf(history: MedalHistory, workouts: MedalWorkout[]) {
  return earliest(
    history.periods.map((period) => {
      const weeks = new Set<number>()
      for (const workout of workouts) {
        const week = weekIndexOf(period, workout.startedAtMs)
        if (week >= 0) {
          weeks.add(week)
          if (weeks.size === MEDAL_THRESHOLDS.periodWeeks) {
            return { atMs: workout.startedAtMs, workoutId: workout.id }
          }
        }
      }
      return undefined
    }),
  )
}

function allLettersOf(history: MedalHistory, workouts: MedalWorkout[]) {
  const program = history.activeProgram
  if (!program || new Set(program.letters).size < MEDAL_THRESHOLDS.minProgramLetters) {
    return undefined
  }
  return earliest(
    history.weeks.map((week) => {
      const letters = new Set<string>()
      for (const workout of workouts) {
        if (
          workout.programId === program.id &&
          program.letters.includes(workout.letter) &&
          week.startsAtMs <= workout.startedAtMs &&
          workout.startedAtMs < week.endsAtMs
        ) {
          letters.add(workout.letter)
          if (letters.size === new Set(program.letters).size) {
            return { atMs: workout.startedAtMs, workoutId: workout.id }
          }
        }
      }
      return undefined
    }),
  )
}

// Each medal of the catalog at its first event from the start of period 1 (D97); the
// history before it still sets the records, the levels and the windows.
export function medalAwardsOf(history: MedalHistory): MedalAward[] {
  const firstPeriod = history.periods[0]
  if (!firstPeriod) {
    return []
  }
  const gameStartsAtMs = firstPeriod.startsAtMs
  const workouts = [...history.workouts].sort((a, b) => a.startedAtMs - b.startedAtMs)
  const used = usedWindowsOf(history).filter(({ atMs }) => atMs >= gameStartsAtMs)
  const weeksMet = weeksMetOf(history.weeks, used)
  const savedBeforeCloseMs = MEDAL_THRESHOLDS.savedBeforeCloseHours * HOUR_MS
  const eventOf: Record<MedalCode, () => MedalEvent | undefined> = {
    first_record: () => firstRecordOf(history.sets, gameStartsAtMs),
    first_window: () => used[0],
    weekly_goal: () => weeksMet[0]?.event,
    week_streak_4: () =>
      weeksMet.find(({ week }) => week.weekStreak >= MEDAL_THRESHOLDS.weekStreak)?.event,
    level_10: () => levelOf(history.levelSteps, MEDAL_THRESHOLDS.levels.level_10, gameStartsAtMs),
    level_20: () => levelOf(history.levelSteps, MEDAL_THRESHOLDS.levels.level_20, gameStartsAtMs),
    volume_up_20: () => volumeUpOf(history),
    full_period: () => fullPeriodOf(history, workouts),
    all_letters_in_week: () => allLettersOf(history, workouts),
    window_saved_at_end: () =>
      used.find(({ atMs, closesAtMs }) => closesAtMs - atMs <= savedBeforeCloseMs),
  }
  return MEDAL_CATALOG.flatMap(({ code }) => {
    const event = eventOf[code]()
    return event && event.atMs <= history.nowMs
      ? [
          {
            code,
            awardedAtMs: event.atMs,
            workoutId: event.workoutId,
            subject: event.subject ?? null,
          },
        ]
      : []
  }).sort((a, b) => a.awardedAtMs - b.awardedAtMs)
}
