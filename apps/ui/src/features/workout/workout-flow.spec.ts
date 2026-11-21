import { describe, expect, it } from 'vitest'
import { PRANCHA, SUPINO_RETO, todayDay } from './test-today'
import { createWorkoutFlow, type WorkoutSession, workoutFlowReducer } from './workout-flow'

const T0 = Date.UTC(2026, 10, 21, 18, 31, 5)

function sessionOf(exercises = [SUPINO_RETO, PRANCHA]): WorkoutSession {
  return {
    workoutId: '0193a1b2-0000-7000-8000-000000000601',
    startedAt: '2026-11-21T18:30:00.000Z',
    programId: 'program-1',
    day: todayDay('A', 'Superior', exercises),
  }
}

function instantOf(id: string): number {
  return Number.parseInt(id.replaceAll('-', '').slice(0, 12), 16)
}

describe('Given the flow on set 1 of supino-reto showing 42500 g from the last workout, planned at 40000 g', () => {
  describe('When next arrives at nowMs', () => {
    it('Then should rest until nowMs + 90 s and record the set with the shown values and a v7 id of nowMs', () => {
      const state = workoutFlowReducer(createWorkoutFlow(sessionOf()), { type: 'next', nowMs: T0 })
      const [recorded] = state.recorded

      expect({
        phase: state.phase,
        restEndsAtMs: state.restEndsAtMs,
        idVersion: recorded?.body.id[14],
        idInstantMs: instantOf(recorded?.body.id ?? ''),
        body: recorded && { ...recorded.body, id: undefined },
      }).toEqual({
        phase: 'rest',
        restEndsAtMs: T0 + 90_000,
        idVersion: '7',
        idInstantMs: T0,
        body: {
          id: undefined,
          workout: { programId: 'program-1', letter: 'A', startedAt: '2026-11-21T18:30:00.000Z' },
          plannedExerciseId: 'planned-supino',
          exerciseId: 'exercise-supino',
          setNumber: 1,
          loadG: 42500,
          reps: 10,
          performedAt: '2026-11-21T18:31:05.000Z',
        },
      })
    })
  })
})

describe('Given the flow on set 1 of prancha, 45 s at 0 g', () => {
  describe('When next arrives at nowMs', () => {
    it('Then should record 45 seconds and no reps, and rest for 60 s', () => {
      const state = workoutFlowReducer(createWorkoutFlow(sessionOf([PRANCHA])), {
        type: 'next',
        nowMs: T0,
      })
      const body = state.recorded[0]?.body

      expect({
        restEndsAtMs: state.restEndsAtMs,
        loadG: body?.loadG,
        seconds: body?.seconds,
        hasReps: body !== undefined && 'reps' in body,
      }).toEqual({ restEndsAtMs: T0 + 60_000, loadG: 0, seconds: 45, hasReps: false })
    })
  })
})

describe('Given a set recorded at t', () => {
  const recorded = workoutFlowReducer(createWorkoutFlow(sessionOf()), { type: 'next', nowMs: T0 })

  describe('When next arrives at t + 799 ms', () => {
    it('Then the state should not change', () => {
      expect(workoutFlowReducer(recorded, { type: 'next', nowMs: T0 + 799 })).toEqual(recorded)
    })
  })

  describe.each([800, 60_000, 200_000])(
    'When next arrives during the rest, at t + %i ms',
    (delayMs) => {
      it('Then the state should not change', () => {
        expect(workoutFlowReducer(recorded, { type: 'next', nowMs: T0 + delayMs })).toEqual(
          recorded,
        )
      })
    },
  )
})

describe('Given the flow back on the set phase with the last set recorded at t', () => {
  const onSet = { ...createWorkoutFlow(sessionOf()), setNumber: 2, lastRecordedAtMs: T0 }

  describe('When next arrives at t + 799 ms', () => {
    it('Then the state should not change', () => {
      expect(workoutFlowReducer(onSet, { type: 'next', nowMs: T0 + 799 })).toEqual(onSet)
    })
  })

  describe('When next arrives at t + 800 ms', () => {
    it('Then should record set 2', () => {
      const state = workoutFlowReducer(onSet, { type: 'next', nowMs: T0 + 800 })

      expect(state.recorded.map(({ body }) => body.setNumber)).toEqual([2])
    })
  })
})
