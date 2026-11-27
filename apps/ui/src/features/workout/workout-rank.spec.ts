import { describe, expect, it } from 'vitest'
import { testPeriod } from '@/features/period/test-period'
import { SUPINO_RETO, todayDay } from './test-today'
import { createWorkoutFlow, type WorkoutFlowState, workoutFlowReducer } from './workout-flow'
import { frozenPeriodPointsOf, provisionalRankOf, rankInPeriodOf, rankTextOf } from './workout-rank'

const T0 = Date.UTC(2026, 11, 2, 18, 31, 5)
const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const SUPINO_AT_PLAN = { ...SUPINO_RETO, loadG: 40000 }

const ranked = (workoutId: string, points: number, position: number) => ({
  workoutId,
  letter: 'A',
  startedAt: '2026-11-25T10:00:00.000Z',
  points,
  position,
})

// Three sets of supino-reto at plan, with no bonus: 30 points.
function finishedWith(periodPoints?: number[] | null): WorkoutFlowState {
  let state = createWorkoutFlow({
    workoutId: WORKOUT_ID,
    startedAt: '2026-12-02T18:30:00.000Z',
    programId: 'program-1',
    day: todayDay('A', 'Superior', [SUPINO_AT_PLAN]),
    windows: [],
    levels: [],
    periodPoints,
  })
  for (const offsetMs of [0, 1000, 2000, 3000, 4000]) {
    state = workoutFlowReducer(state, { type: 'next', nowMs: T0 + offsetMs * 100 })
  }
  return state
}

describe('frozenPeriodPointsOf', () => {
  describe('Given the copy of the period with two workouts', () => {
    it('Then it keeps the points of each one', () => {
      const period = testPeriod({ ranking: [ranked('w1', 90, 1), ranked('w2', 20, 2)] })

      expect(frozenPeriodPointsOf(period, T0)).toEqual([90, 20])
    })
  })

  describe('Given the copy of a period that ended before the start', () => {
    it('Then the workout starts a new period, with no points to beat', () => {
      const period = testPeriod({ ranking: [ranked('w1', 90, 1)] })

      expect(frozenPeriodPointsOf(period, Date.parse(period.endsAt))).toEqual([])
    })
  })

  describe('Given no copy of the period', () => {
    it('Then there is no ranking to freeze', () => {
      expect(frozenPeriodPointsOf(null, T0)).toBeNull()
    })
  })
})

describe('provisionalRankOf', () => {
  describe('Given one workout of the period with more points and others with fewer', () => {
    it('Then the workout of 30 points is second of the period', () => {
      expect(provisionalRankOf(finishedWith([90, 20, 10]))).toEqual({ points: 30, position: 2 })
    })
  })

  describe('Given a workout started with no copy of the period', () => {
    it('Then it shows the points with no position', () => {
      expect(provisionalRankOf(finishedWith(null))).toEqual({ points: 30, position: null })
    })
  })

  describe('Given a workout saved before the ranking was frozen', () => {
    it('Then it shows the points with no position', () => {
      expect(provisionalRankOf(finishedWith(undefined)).position).toBeNull()
    })
  })
})

describe('rankInPeriodOf', () => {
  describe('Given the answer of the API with the workout in the ranking', () => {
    it('Then the points and the position are the ones of the API', () => {
      const period = testPeriod({ ranking: [ranked('w1', 90, 1), ranked(WORKOUT_ID, 40, 2)] })

      expect(rankInPeriodOf(period, WORKOUT_ID)).toEqual({ points: 40, position: 2 })
    })
  })

  describe('Given the answer of the API without the workout', () => {
    it('Then there is no rank from the API', () => {
      expect(rankInPeriodOf(testPeriod({ ranking: [] }), WORKOUT_ID)).toBeNull()
    })
  })
})

describe('rankTextOf', () => {
  it.each([
    [1, '1º do período'],
    [2, '2º do período'],
  ])('Given position %i, Then it reads "%s"', (position, text) => {
    expect(rankTextOf(position)).toBe(text)
  })
})
