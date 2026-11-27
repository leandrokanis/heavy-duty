import { describe, expect, it } from 'vitest'
import { gameReplayOf, groupLevelsOf, type ProgressSet } from './progress.rules.js'
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

// The progress of each group right after the last set, before any cooling.
function progressOf(sets: ProgressSet[], parameters: typeof GAME_PARAMETERS) {
  const lastMs = Math.max(...sets.map(({ performedAtMs }) => performedAtMs))
  return new Map(
    [...groupLevelsOf(sets, parameters, lastMs)].map(([slug, { progress }]) => [slug, progress]),
  )
}

describe('groupLevelsOf', () => {
  describe('Given one workout with the 3 planned sets of chest at plan, with no window before', () => {
    it('Then chest gains 60 and reaches level 2 with 20 on the bar', () => {
      const progress = progressOf(benchWorkout('workout-1', T0), GAME_PARAMETERS)

      expect(progress.get('chest')).toEqual({ level: 2, points: 20, bestLevel: 2 })
    })

    it('Then triceps, secondary, gains 5 per set', () => {
      const progress = progressOf(benchWorkout('workout-1', T0), GAME_PARAMETERS)

      expect(progress.get('triceps')).toEqual({ level: 1, points: 15, bestLevel: 1 })
    })
  })

  describe('Given a second chest workout 50 hours later, inside the window of the first', () => {
    it('Then chest gains 120 more and climbs to level 5', () => {
      const sets = [
        ...benchWorkout('workout-1', T0),
        ...benchWorkout('workout-2', T0 + 50 * HOUR_MS),
      ]

      expect(progressOf(sets, GAME_PARAMETERS).get('chest')).toEqual({
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

      expect(progressOf(sets, GAME_PARAMETERS).get('chest')).toEqual({
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

      expect(progressOf(sets, GAME_PARAMETERS).get('chest')?.level).toBe(5)
    })
  })

  describe('Given a workout whose letter was removed, with no planned sets frozen', () => {
    it('Then the planned sets of chest are the sets recorded of chest in that workout', () => {
      const sets = benchWorkout('workout-1', T0, { plannedGroupSets: null }).slice(0, 2)

      expect(progressOf(sets, GAME_PARAMETERS).get('chest')).toEqual({
        level: 2,
        points: 20,
        bestLevel: 2,
      })
    })
  })

  describe('Given a group never trained', () => {
    it('Then it has no progress in the replay', () => {
      expect(progressOf(benchWorkout('workout-1', T0), GAME_PARAMETERS).has('back')).toBe(false)
    })
  })
})

describe('groupLevelsOf with cooling (US-F10-03)', () => {
  // One workout of chest at T0: the window closes 120 h after its last set, with chest at level 2
  // and 20 points on the bar.
  const closesAtMs = T0 + 2 * 60_000 + 120 * HOUR_MS
  const levelsAt = (nowMs: number, sets = benchWorkout('workout-1', T0)) =>
    groupLevelsOf(sets, GAME_PARAMETERS, nowMs).get('chest')

  describe('Given the window of chest still open', () => {
    it('Then chest is not cooling and keeps its bar', () => {
      expect(levelsAt(closesAtMs - HOUR_MS)).toEqual({
        progress: { level: 2, points: 20, bestLevel: 2 },
        cooling: false,
        nextDropAtMs: null,
      })
    })
  })

  describe('Given the window of chest closed 6 hours ago', () => {
    it('Then chest is cooling with 10 points less, and drops when the loss reaches 20', () => {
      expect(levelsAt(closesAtMs + 6 * HOUR_MS)).toEqual({
        progress: { level: 2, points: 10, bestLevel: 2 },
        cooling: true,
        nextDropAtMs: closesAtMs + 12 * HOUR_MS,
      })
    })
  })

  describe('Given the bar of chest reached zero 12 hours after the close', () => {
    it('Then chest drops to level 1 with the bar of level 1 full, and level 1 never drops', () => {
      expect(levelsAt(closesAtMs + 12 * HOUR_MS)).toEqual({
        progress: { level: 1, points: 40, bestLevel: 2 },
        cooling: true,
        nextDropAtMs: null,
      })
    })
  })

  describe('Given chest trained again 12 hours after the close', () => {
    it('Then the training stops the cooling and the first workout back yields double', () => {
      const sets = [
        ...benchWorkout('workout-1', T0),
        ...benchWorkout('workout-2', closesAtMs + 12 * HOUR_MS),
      ]

      expect(levelsAt(closesAtMs + 13 * HOUR_MS, sets)).toEqual({
        progress: { level: 4, points: 31, bestLevel: 4 },
        cooling: false,
        nextDropAtMs: null,
      })
    })
  })
})

describe('Given the window of chest closing during the second workout (D56)', () => {
  it('Then only the set inside the window doubles, and the sets after the close yield the common gain', () => {
    const closesAtMs = T0 + 2 * 60_000 + 120 * HOUR_MS
    const sets = [
      ...benchWorkout('workout-1', T0),
      ...benchWorkout('workout-2', closesAtMs - 60_000),
    ]

    expect(
      groupLevelsOf(sets, GAME_PARAMETERS, closesAtMs + 2 * 60_000).get('chest')?.progress,
    ).toEqual({
      level: 4,
      points: 11,
      bestLevel: 4,
    })
  })
})

describe('groupLevelsOf with muscle memory (US-F10-04)', () => {
  // Two chest workouts, the second in the window of the first, take chest to level 5; a week of
  // cooling after the close of the second drops it to level 1, with best level 5.
  const secondMs = T0 + 50 * HOUR_MS
  const closesAtMs = secondMs + 2 * 60_000 + 120 * HOUR_MS
  const backMs = closesAtMs + 168 * HOUR_MS
  const history = [...benchWorkout('workout-1', T0), ...benchWorkout('workout-2', secondMs)]

  describe('Given chest at level 1 with best level 5 after the cooling', () => {
    it('Then chest is below its best level', () => {
      expect(groupLevelsOf(history, GAME_PARAMETERS, backMs).get('chest')?.progress).toEqual({
        level: 1,
        points: 0,
        bestLevel: 5,
      })
    })
  })

  describe('Given a workout 2 hours after the first one back, before the window opens', () => {
    it('Then each set below the best level yields double, the one that crosses it too, and the next one the common gain', () => {
      const sets = [
        ...history,
        ...benchWorkout('workout-3', backMs),
        ...benchWorkout('workout-4', backMs + 2 * HOUR_MS),
      ]

      expect(
        groupLevelsOf(sets, GAME_PARAMETERS, backMs + 3 * HOUR_MS).get('chest')?.progress,
      ).toEqual({ level: 5, points: 42, bestLevel: 5 })
    })
  })
})

describe('gameReplayOf, the points of each set (US-F19-02)', () => {
  function pointsOf(sets: ProgressSet[]) {
    const lastMs = Math.max(...sets.map(({ performedAtMs }) => performedAtMs))
    return gameReplayOf(sets, GAME_PARAMETERS, lastMs).setPoints
  }

  describe('Given one workout with 3 sets at plan, with no window before', () => {
    it('Then each set yields the common 10 points, in time order', () => {
      expect(pointsOf(benchWorkout('workout-1', T0))).toEqual([
        { workoutId: 'workout-1', performedAtMs: T0, points: 10 },
        { workoutId: 'workout-1', performedAtMs: T0 + 60_000, points: 10 },
        { workoutId: 'workout-1', performedAtMs: T0 + 120_000, points: 10 },
      ])
    })
  })

  describe('Given a second chest workout 50 hours later, inside the window of the first', () => {
    it('Then each set of the second workout yields the double', () => {
      const sets = [
        ...benchWorkout('workout-1', T0),
        ...benchWorkout('workout-2', T0 + 50 * HOUR_MS),
      ]

      expect(
        pointsOf(sets)
          .filter(({ workoutId }) => workoutId === 'workout-2')
          .map(({ points }) => points),
      ).toEqual([20, 20, 20])
    })
  })

  describe('Given only the secondary group of a set inside its window', () => {
    it('Then the set yields the common points', () => {
      const sets = [
        benchSet({
          workoutId: 'workout-1',
          primaryGroupSlugs: ['triceps'],
          secondaryGroupSlugs: [],
          plannedGroupSets: { triceps: 1 },
        }),
        benchSet({ workoutId: 'workout-2', performedAtMs: T0 + 50 * HOUR_MS }),
      ]

      expect(pointsOf(sets).at(-1)?.points).toBe(10)
    })
  })

  describe('Given chest back a month after its window closed, below its best level', () => {
    it('Then the set back yields the double, once', () => {
      const sets = [
        ...benchWorkout('workout-1', T0),
        ...benchWorkout('workout-2', T0 + 50 * HOUR_MS),
        benchSet({ workoutId: 'workout-3', performedAtMs: T0 + 30 * 24 * HOUR_MS }),
      ]

      expect(pointsOf(sets).at(-1)?.points).toBe(20)
    })
  })

  describe('Given the same history', () => {
    it('Then the levels are the ones of groupLevelsOf', () => {
      const sets = [
        ...benchWorkout('workout-1', T0),
        ...benchWorkout('workout-2', T0 + 50 * HOUR_MS),
      ]
      const nowMs = T0 + 60 * HOUR_MS

      expect(gameReplayOf(sets, GAME_PARAMETERS, nowMs).levels).toEqual(
        groupLevelsOf(sets, GAME_PARAMETERS, nowMs),
      )
    })
  })
})

describe('gameReplayOf, the level of each group after each set (US-F19-01)', () => {
  function stepsOf(sets: ProgressSet[], groupSlug: string) {
    const lastMs = Math.max(...sets.map(({ performedAtMs }) => performedAtMs))
    return gameReplayOf(sets, GAME_PARAMETERS, lastMs).levelSteps.filter(
      (step) => step.groupSlug === groupSlug,
    )
  }

  describe('Given one workout with 3 sets at plan, 20 points each for chest', () => {
    it('Then chest should step to level 2 at the second set, which fills the 40 of level 1', () => {
      expect(stepsOf(benchWorkout('workout-1', T0), 'chest')).toEqual([
        { workoutId: 'workout-1', performedAtMs: T0, groupSlug: 'chest', level: 1 },
        { workoutId: 'workout-1', performedAtMs: T0 + 60_000, groupSlug: 'chest', level: 2 },
        { workoutId: 'workout-1', performedAtMs: T0 + 120_000, groupSlug: 'chest', level: 2 },
      ])
    })

    it('Then the secondary triceps should have a step at each set too', () => {
      expect(stepsOf(benchWorkout('workout-1', T0), 'triceps').map(({ level }) => level)).toEqual([
        1, 1, 1,
      ])
    })
  })
})
