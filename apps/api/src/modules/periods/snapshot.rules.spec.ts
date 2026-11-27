import { describe, expect, it } from 'vitest'
import type { ProgressSet } from '../windows/progress.rules.js'
import { GAME_PARAMETERS } from '../windows/windows.config.js'
import { periodSnapshotOf } from './snapshot.rules.js'

const HOUR_MS = 60 * 60 * 1000
const STARTS_AT_MS = Date.parse('2026-11-23T03:00:00.000Z')
const ENDS_AT_MS = STARTS_AT_MS + 84 * 24 * HOUR_MS

function benchSet(workoutId: string, performedAtMs: number): ProgressSet {
  return {
    workoutId,
    letter: 'A',
    goal: 'hypertrophy',
    performedAtMs,
    loadG: 40000,
    reps: 10,
    seconds: null,
    plan: { plannedLoadG: 40000, targetReps: 10, targetSeconds: null },
    plannedGroupSets: { chest: 3 },
    primaryGroupSlugs: ['chest'],
    secondaryGroupSlugs: [],
  }
}

// Three sets of supino-reto at plan, a minute apart: 10 points each, 20 for the bar of chest.
function benchWorkout(workoutId: string, startMs: number): ProgressSet[] {
  return [0, 1, 2].map((minute) => benchSet(workoutId, startMs + minute * 60_000))
}

const workout = (id: string, startMs: number) => ({
  id,
  letter: 'A',
  startedAt: new Date(startMs).toISOString(),
})

function snapshotOf(sets: ProgressSet[], workouts: ReturnType<typeof workout>[]) {
  return periodSnapshotOf({
    sets,
    parameters: GAME_PARAMETERS,
    startsAtMs: STARTS_AT_MS,
    endsAtMs: ENDS_AT_MS,
    workouts,
    muscleGroupSlugs: ['chest', 'back'],
  })
}

describe('periodSnapshotOf', () => {
  // The last chest workout of the period is 2 hours before its end; the next one, an hour after.
  const lastMs = ENDS_AT_MS - 2 * HOUR_MS
  const afterMs = ENDS_AT_MS + HOUR_MS
  const firstMs = lastMs - 50 * HOUR_MS
  const sets = [
    ...benchWorkout('w1', firstMs),
    ...benchWorkout('w2', lastMs),
    ...benchWorkout('w3', afterMs),
  ]
  const workouts = [workout('w1', firstMs), workout('w2', lastMs)]

  describe('Given chest trained twice at the end of the period and once after it', () => {
    const snapshot = snapshotOf(sets, workouts)
    const chest = snapshot.groups.find(({ slug }) => slug === 'chest')

    it('Then chest should keep the level of the instant of the end, with no set after it', () => {
      expect(chest).toMatchObject({ level: 5, points: 2, bestLevel: 5 })
    })

    it('Then chest should be resting at the end, the window of the last workout still to open', () => {
      expect(chest?.windowState).toBe('resting')
    })

    it('Then chest should count the window of the first workout used in the period', () => {
      expect(chest).toMatchObject({ windowsUsed: 1, windowsMissed: 0 })
    })

    it('Then the period should hold the windows, the points of its workouts and the best one', () => {
      expect({
        windowsUsed: snapshot.windowsUsed,
        windowsMissed: snapshot.windowsMissed,
        points: snapshot.points,
        bestWorkoutPoints: snapshot.bestWorkoutPoints,
      }).toEqual({ windowsUsed: 1, windowsMissed: 0, points: 90, bestWorkoutPoints: 60 })
    })
  })

  describe('Given back never trained', () => {
    it('Then back should be at level 1 with no window', () => {
      const back = snapshotOf(sets, workouts).groups.find(({ slug }) => slug === 'back')

      expect(back).toEqual({
        slug: 'back',
        level: 1,
        points: 0,
        bestLevel: 1,
        windowState: 'none',
        windowsUsed: 0,
        windowsMissed: 0,
      })
    })
  })

  describe('Given a period with no workout', () => {
    it('Then the period should have 0 points and 0 for the best workout', () => {
      expect(snapshotOf([], [])).toMatchObject({ points: 0, bestWorkoutPoints: 0 })
    })
  })
})
