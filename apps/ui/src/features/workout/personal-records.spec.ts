import { describe, expect, it } from 'vitest'
import { PRANCHA, SUPINO_RETO, todayDay } from './test-today'
import type { TodayExercise } from './today.types'
import {
  createWorkoutFlow,
  lastSetOf,
  recordMarkOf,
  sequenceOf,
  type WorkoutFlowState,
  workoutFlowReducer,
} from './workout-flow'

const T0 = Date.UTC(2026, 10, 21, 18, 31, 5)
const REST_MS = 90_000

// Supino 3 x 10 at 42.5 kg on screen, with the record for 10 reps at 42.5 kg.
const SUPINO_WITH_RECORD: TodayExercise = {
  ...SUPINO_RETO,
  loadG: 42_500,
  records: [{ reps: 10, loadG: 42_500 }],
}

function startOf(exercises: TodayExercise[]): WorkoutFlowState {
  return createWorkoutFlow({
    workoutId: '0193a1b2-0000-7000-8000-000000000601',
    startedAt: '2026-11-21T18:30:00.000Z',
    programId: 'program-1',
    day: todayDay('A', 'Superior', exercises),
  })
}

function adjust(state: WorkoutFlowState, field: 'loadG' | 'reps', steps: number) {
  return workoutFlowReducer(state, { type: 'adjust', field, steps })
}

function next(state: WorkoutFlowState, nowMs: number) {
  return workoutFlowReducer(state, { type: 'next', nowMs })
}

function restEnd(state: WorkoutFlowState, nowMs: number) {
  return workoutFlowReducer(state, { type: 'restEnd', nowMs })
}

function correctLoad(state: WorkoutFlowState, loadG: number, nowMs: number) {
  const open = workoutFlowReducer(state, { type: 'openSheet', sheet: 'correction' })
  return workoutFlowReducer(open, {
    type: 'correctLastSet',
    values: { loadG, reps: 10, seconds: null },
    nowMs,
  })
}

describe('Given supino with the record for 10 reps at 42.5 kg', () => {
  describe('When the athlete opens a set of supino with 10 reps', () => {
    it('Then the mark shows 42.5 kg, not passed', () => {
      expect(recordMarkOf(startOf([SUPINO_WITH_RECORD]))).toEqual({
        loadG: 42_500,
        passed: false,
      })
    })
  })

  describe('When the athlete raises the load to 45 kg', () => {
    it('Then the mark lights up', () => {
      const raised = adjust(startOf([SUPINO_WITH_RECORD]), 'loadG', 1)

      expect(recordMarkOf(raised)).toEqual({ loadG: 42_500, passed: true })
    })
  })

  describe('When the athlete records 10 reps with 45 kg', () => {
    const recorded = next(adjust(startOf([SUPINO_WITH_RECORD]), 'loadG', 1), T0)

    it('Then the last set is a record', () => {
      expect(lastSetOf(recorded)?.record).toBe(true)
    })

    it('Then the record for 10 reps of the next set becomes 45 kg', () => {
      expect(recordMarkOf(restEnd(recorded, T0 + REST_MS))).toEqual({
        loadG: 45_000,
        passed: false,
      })
    })

    describe('and corrects the set to 40 kg, below the former record', () => {
      const corrected = correctLoad(recorded, 40_000, T0 + 5_000)

      it('Then the last set is no longer a record', () => {
        expect(lastSetOf(corrected)?.record).toBe(false)
      })

      it('Then the record for 10 reps of the next set goes back to 42.5 kg', () => {
        expect(recordMarkOf(restEnd(corrected, T0 + REST_MS))?.loadG).toBe(42_500)
      })
    })
  })
})

describe('Given supino with the record of 10 reps with 40 kg', () => {
  const supino = { ...SUPINO_RETO, loadG: 40_000, records: [{ reps: 10, loadG: 40_000 }] }

  describe('When the athlete raises the reps to 12', () => {
    it('Then the mark lights up with no load record for 12 reps', () => {
      expect(recordMarkOf(adjust(startOf([supino]), 'reps', 2))).toEqual({
        loadG: null,
        passed: true,
      })
    })
  })

  describe('When the athlete lowers the reps to 8', () => {
    it('Then no mark shows, since 8 reps have no record to beat', () => {
      expect(recordMarkOf(adjust(startOf([supino]), 'reps', -2))).toBeNull()
    })
  })
})

describe('Given supino with no past set', () => {
  const supino = { ...SUPINO_RETO, loadG: 40_000, records: [] }

  describe('When the athlete records the first set and then a heavier one', () => {
    it('Then only the second set is a record in the sequence', () => {
      const first = next(startOf([supino]), T0)
      const second = next(adjust(restEnd(first, T0 + REST_MS), 'loadG', 1), T0 + REST_MS + 1_000)
      const third = next(restEnd(second, T0 + 2 * REST_MS + 1_000), T0 + 2 * REST_MS + 2_000)

      expect(sequenceOf(third)[0]?.recordedSets.map(({ record }) => record === true)).toEqual([
        false,
        true,
        false,
      ])
    })
  })
})

describe('Given a copy of the workout of the day saved before the records existed', () => {
  const { records: _records, ...supino } = SUPINO_WITH_RECORD

  describe('When the athlete opens a set of supino', () => {
    it('Then no mark shows', () => {
      expect(recordMarkOf(startOf([supino as TodayExercise]))).toBeNull()
    })
  })
})

describe('Given prancha, a timed exercise', () => {
  describe('When the athlete opens a set of prancha', () => {
    it('Then no mark shows', () => {
      expect(recordMarkOf(startOf([{ ...PRANCHA, records: [] }]))).toBeNull()
    })
  })
})

describe('Given the rest after a set of supino', () => {
  describe('When the mark is read outside the set screen', () => {
    it('Then no mark shows', () => {
      expect(recordMarkOf(next(startOf([SUPINO_WITH_RECORD]), T0))).toBeNull()
    })
  })
})
