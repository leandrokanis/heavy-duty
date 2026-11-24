import { describe, expect, it } from 'vitest'
import { groupProgressOf, type ProgressSet } from './progress.rules.js'
import { GAME_PARAMETERS } from './windows.config.js'

const HOUR_MS = 60 * 60 * 1000
const T0 = Date.UTC(2026, 10, 20, 18, 30)

function benchSet(overrides: Partial<ProgressSet> = {}): ProgressSet {
  return {
    workoutId: 'workout-1',
    letter: 'A',
    goal: 'hypertrophy',
    performedAtMs: T0,
    loadG: 40000,
    reps: 10,
    seconds: null,
    plan: { plannedLoadG: 40000, targetReps: 10, targetSeconds: null },
    plannedGroupSets: { chest: 3 },
    primaryGroupSlugs: ['chest'],
    secondaryGroupSlugs: ['triceps'],
    ...overrides,
  }
}

// Three sets of supino-reto at plan, a minute apart, in one workout.
function benchWorkout(workoutId: string, startMs: number, overrides: Partial<ProgressSet> = {}) {
  return [0, 1, 2].map((minute) =>
    benchSet({ workoutId, performedAtMs: startMs + minute * 60_000, ...overrides }),
  )
}

describe('groupProgressOf', () => {
  describe('Given one workout with the 3 planned sets of chest at plan, with no window before', () => {
    it('Then chest gains 60 and reaches level 2 with 20 on the bar', () => {
      const progress = groupProgressOf(benchWorkout('workout-1', T0), GAME_PARAMETERS)

      expect(progress.get('chest')).toEqual({ level: 2, points: 20, bestLevel: 2 })
    })

    it('Then triceps, secondary, gains 5 per set', () => {
      const progress = groupProgressOf(benchWorkout('workout-1', T0), GAME_PARAMETERS)

      expect(progress.get('triceps')).toEqual({ level: 1, points: 15, bestLevel: 1 })
    })
  })

  describe('Given a second chest workout 50 hours later, inside the window of the first', () => {
    it('Then chest gains 120 more and climbs to level 5', () => {
      const sets = [
        ...benchWorkout('workout-1', T0),
        ...benchWorkout('workout-2', T0 + 50 * HOUR_MS),
      ]

      expect(groupProgressOf(sets, GAME_PARAMETERS).get('chest')).toEqual({
        level: 5,
        points: 2,
        bestLevel: 5,
      })
    })
  })

  describe('Given a second chest workout 2 hours later, before the window opens', () => {
    it('Then chest gains the common 60 more', () => {
      const sets = [
        ...benchWorkout('workout-1', T0),
        ...benchWorkout('workout-2', T0 + 2 * HOUR_MS),
      ]

      expect(groupProgressOf(sets, GAME_PARAMETERS).get('chest')).toEqual({
        level: 3,
        points: 37,
        bestLevel: 3,
      })
    })
  })

  describe('Given the sets of the second workout arrive before those of the first in the list', () => {
    it('Then the replay follows the time of the sets', () => {
      const sets = [
        ...benchWorkout('workout-2', T0 + 50 * HOUR_MS),
        ...benchWorkout('workout-1', T0),
      ]

      expect(groupProgressOf(sets, GAME_PARAMETERS).get('chest')?.level).toBe(5)
    })
  })

  describe('Given a workout whose letter was removed, with no planned sets frozen', () => {
    it('Then the planned sets of chest are the sets recorded of chest in that workout', () => {
      const sets = benchWorkout('workout-1', T0, { plannedGroupSets: null }).slice(0, 2)

      expect(groupProgressOf(sets, GAME_PARAMETERS).get('chest')).toEqual({
        level: 2,
        points: 20,
        bestLevel: 2,
      })
    })
  })

  describe('Given a group never trained', () => {
    it('Then it has no progress in the replay', () => {
      expect(groupProgressOf(benchWorkout('workout-1', T0), GAME_PARAMETERS).has('back')).toBe(
        false,
      )
    })
  })
})
