import { describe, expect, it } from 'vitest'
import { CRUCIFIXO, PRANCHA, SUPINO_RETO, TRICEPS_POLIA, todayDay } from './test-today'
import {
  announcementOf,
  canSkipOf,
  createWorkoutFlow,
  currentExercise,
  deadlineOf,
  exerciseProgressOf,
  lastSetOf,
  leftOutOf,
  restoreWorkoutFlow,
  sequenceOf,
  shownValuesOf,
  timerReadingOf,
  upcomingExercise,
  type WorkoutFlowState,
  type WorkoutSession,
  workoutFlowReducer,
} from './workout-flow'
import type { RecordWorkoutSetBody } from './workout-set.types'

const T0 = Date.UTC(2026, 10, 21, 18, 31, 5)

function sessionOf(exercises = [SUPINO_RETO, PRANCHA]): WorkoutSession {
  return {
    workoutId: '0193a1b2-0000-7000-8000-000000000601',
    startedAt: '2026-11-21T18:30:00.000Z',
    programId: 'program-1',
    day: todayDay('A', 'Superior', exercises),
  }
}

// Letter 'A' of the spec: supino-reto 3 x 10 resting 90 s, then triceps-polia 3 x 12 resting 60 s.
const LETTER_A = [SUPINO_RETO, TRICEPS_POLIA]

function next(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  return workoutFlowReducer(state, { type: 'next', nowMs })
}

function restEnd(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  return workoutFlowReducer(state, { type: 'restEnd', nowMs })
}

function timerReach(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  return workoutFlowReducer(state, { type: 'timerReach', nowMs })
}

function cancel(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  return workoutFlowReducer(state, { type: 'cancel', nowMs })
}

// Supino at 40 kg from the program, 3 x 10 resting 90 s (the fixture of the drag adjust spec).
const SUPINO_40 = {
  ...SUPINO_RETO,
  loadG: 40_000,
  plannedLoadG: 40_000,
  loadSource: 'program' as const,
}

function adjust(
  state: WorkoutFlowState,
  field: 'loadG' | 'reps' | 'seconds',
  steps: number,
): WorkoutFlowState {
  return workoutFlowReducer(state, { type: 'adjust', field, steps })
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
        idVersion: recorded?.id[14],
        idInstantMs: instantOf(recorded?.id ?? ''),
        body: recorded && { ...recorded, id: undefined },
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
  describe('When next arrives at T0', () => {
    it('Then should open the 3 s countdown and record no set', () => {
      const state = next(createWorkoutFlow(sessionOf([PRANCHA])), T0)

      expect({
        phase: state.phase,
        executionStartsAtMs: state.executionStartsAtMs,
        lastStepAtMs: state.lastStepAtMs,
        lastStep: state.lastStep,
        recorded: state.recorded.length,
      }).toEqual({
        phase: 'countdown',
        executionStartsAtMs: T0 + 3000,
        lastStepAtMs: T0,
        lastStep: 'countdown',
        recorded: 0,
      })
    })
  })
})

describe('Given the countdown of prancha opened at T0', () => {
  const counting = next(createWorkoutFlow(sessionOf([PRANCHA])), T0)

  describe.each([1000, 2999])('When next arrives at T0 + %i ms', (offsetMs) => {
    it('Then the state should not change', () => {
      expect(next(counting, T0 + offsetMs)).toEqual(counting)
    })
  })

  describe('When timerReach arrives at T0 + 2999 ms', () => {
    it('Then the state should not change', () => {
      expect(timerReach(counting, T0 + 2999)).toEqual(counting)
    })
  })

  describe('When timerReach arrives at T0 + 3000 ms', () => {
    it('Then the execution should begin at that instant', () => {
      const state = timerReach(counting, T0 + 3000)

      expect({
        phase: state.phase,
        lastStep: state.lastStep,
        lastStepAtMs: state.lastStepAtMs,
      }).toEqual({ phase: 'timing', lastStep: 'begin', lastStepAtMs: T0 + 3000 })
    })
  })
})

describe('Given the execution of prancha begun at T0 + 3000 ms', () => {
  const timing = timerReach(next(createWorkoutFlow(sessionOf([PRANCHA])), T0), T0 + 3000)

  describe('When timerReach arrives at T0 + 47999 ms', () => {
    it('Then the state should not change', () => {
      expect(timerReach(timing, T0 + 47_999)).toEqual(timing)
    })
  })

  describe('When timerReach arrives at T0 + 48000 ms', () => {
    it('Then should record the set with the target at that instant and rest for 60 s', () => {
      const state = timerReach(timing, T0 + 48_000)
      const [body] = state.recorded

      expect({
        set: body && {
          setNumber: body.setNumber,
          seconds: body.seconds,
          loadG: body.loadG,
          hasReps: 'reps' in body,
          performedAt: body.performedAt,
        },
        phase: state.phase,
        restEndsAtMs: state.restEndsAtMs,
        executionStartsAtMs: state.executionStartsAtMs,
        lastStep: state.lastStep,
      }).toEqual({
        set: {
          setNumber: 1,
          seconds: 45,
          loadG: 0,
          hasReps: false,
          performedAt: new Date(T0 + 48_000).toISOString(),
        },
        phase: 'rest',
        restEndsAtMs: T0 + 108_000,
        executionStartsAtMs: null,
        lastStep: 'timerEnd',
      })
    })
  })
})

describe('Given the clock jumped past the end of the timed exercise (screen off)', () => {
  const counting = next(createWorkoutFlow(sessionOf([PRANCHA, SUPINO_RETO])), T0)

  describe('When one timerReach arrives at T0 + 88000 ms with the count still open', () => {
    it('Then should record the set at the calculated end and rest from there', () => {
      const state = timerReach(counting, T0 + 88_000)

      expect({
        seconds: state.recorded[0]?.seconds,
        performedAt: state.recorded[0]?.performedAt,
        phase: state.phase,
        restEndsAtMs: state.restEndsAtMs,
        lastStepAtMs: state.lastStepAtMs,
      }).toEqual({
        seconds: 45,
        performedAt: new Date(T0 + 48_000).toISOString(),
        phase: 'rest',
        restEndsAtMs: T0 + 108_000,
        lastStepAtMs: T0 + 88_000,
      })
    })
  })

  describe('When the app returns at T0 + 58000 ms with the execution at 30 s left', () => {
    it('Then should record 45 s and end the rest at T0 + 108000 ms', () => {
      const timing = timerReach(counting, T0 + 18_000)
      const state = timerReach(timing, T0 + 58_000)

      expect({
        seconds: state.recorded[0]?.seconds,
        phase: state.phase,
        restEndsAtMs: state.restEndsAtMs,
      }).toEqual({ seconds: 45, phase: 'rest', restEndsAtMs: T0 + 108_000 })
    })
  })
})

describe('Given the execution of prancha begun at T0 + 3000 ms and next arriving to end it early', () => {
  const timing = timerReach(next(createWorkoutFlow(sessionOf([PRANCHA])), T0), T0 + 3000)

  describe.each([
    { offsetMs: 18_000, seconds: 15 },
    { offsetMs: 18_500, seconds: 15 },
    { offsetMs: 3900, seconds: 1 },
  ])('When next arrives at T0 + $offsetMs ms', ({ offsetMs, seconds }) => {
    it(`Then should record ${seconds} s at the tap and rest from the tap`, () => {
      const atMs = T0 + offsetMs
      const restEndsAtMs = atMs + 60_000
      const state = next(timing, atMs)

      expect({
        seconds: state.recorded[0]?.seconds,
        performedAt: state.recorded[0]?.performedAt,
        restEndsAtMs: state.restEndsAtMs,
        lastStep: state.lastStep,
      }).toEqual({
        seconds,
        performedAt: new Date(atMs).toISOString(),
        restEndsAtMs,
        lastStep: 'record',
      })
    })
  })

  describe('When next arrives at T0 + 3799 ms, inside the guard of the start', () => {
    it('Then the state should not change', () => {
      expect(next(timing, T0 + 3799)).toEqual(timing)
    })
  })
})

describe('Given the timer of prancha open, in the count or in the execution', () => {
  const counting = next(createWorkoutFlow(sessionOf([PRANCHA])), T0)
  const timing = timerReach(counting, T0 + 3000)

  describe.each([
    { name: 'the count', state: counting, atMs: T0 + 1000 },
    { name: 'the execution', state: timing, atMs: T0 + 20_000 },
  ])('When cancel arrives during $name', ({ state, atMs }) => {
    it('Then should go back to set 1 with no set recorded, and guard from the tap', () => {
      const cancelled = cancel(state, atMs)

      expect({
        phase: cancelled.phase,
        setNumber: cancelled.setNumber,
        executionStartsAtMs: cancelled.executionStartsAtMs,
        recorded: cancelled.recorded.length,
        lastStep: cancelled.lastStep,
        lastStepAtMs: cancelled.lastStepAtMs,
        tapInsideGuard: next(cancelled, atMs + 799) === cancelled,
        tapAfterGuard: next(cancelled, atMs + 800).phase,
      }).toEqual({
        phase: 'set',
        setNumber: 1,
        executionStartsAtMs: null,
        recorded: 0,
        lastStep: 'cancel',
        lastStepAtMs: atMs,
        tapInsideGuard: true,
        tapAfterGuard: 'countdown',
      })
    })
  })

  describe('When cancel arrives with no timer open', () => {
    it('Then the state should not change', () => {
      const onSet = createWorkoutFlow(sessionOf([PRANCHA]))

      expect(cancel(onSet, T0)).toBe(onSet)
    })
  })
})

describe('Given a timed exercise whose end follows the rules of the rest', () => {
  const ONE_SET_PRANCHA = { ...PRANCHA, sets: 1 }
  const NO_REST_PRANCHA = { ...PRANCHA, restSeconds: 0 }

  describe.each([
    {
      name: 'end by the clock on a prancha with a 0 s rest',
      exercises: [NO_REST_PRANCHA, SUPINO_RETO],
      end: (state: WorkoutFlowState) => timerReach(state, T0 + 48_000),
      phase: 'set',
      setNumber: 2,
    },
    {
      name: 'end by the clock on the only set of the letter',
      exercises: [ONE_SET_PRANCHA],
      end: (state: WorkoutFlowState) => timerReach(state, T0 + 48_000),
      phase: 'finished',
      setNumber: 1,
    },
    {
      name: 'end early on the only set of the letter',
      exercises: [ONE_SET_PRANCHA],
      end: (state: WorkoutFlowState) => next(timerReach(state, T0 + 3000), T0 + 20_000),
      phase: 'finished',
      setNumber: 1,
    },
  ])('When the execution reaches its $name', ({ exercises, end, phase, setNumber }) => {
    it(`Then the phase should be ${phase}`, () => {
      const state = end(next(createWorkoutFlow(sessionOf(exercises)), T0))
      const last = state.recorded.at(-1)

      expect({
        phase: state.phase,
        setNumber: state.setNumber,
        finish: state.finish,
      }).toEqual({
        phase,
        setNumber,
        finish:
          phase === 'finished' ? { finishedAt: last?.performedAt, endReason: 'completed' } : null,
      })
    })
  })
})

describe('Given the timer of a letter with a second exercise open, in the count or in the execution', () => {
  const counting = next(createWorkoutFlow(sessionOf([PRANCHA, SUPINO_RETO])), T0)
  const timing = timerReach(counting, T0 + 3000)

  describe.each([
    { name: 'the count', state: counting },
    { name: 'the execution', state: timing },
  ])('When the sequence actions arrive during $name', ({ state }) => {
    it.each([
      { type: 'openSheet', sheet: 'sequence' },
      { type: 'goTo', exerciseIndex: 1, nowMs: T0 + 5000 },
      { type: 'skip', nowMs: T0 + 5000 },
      { type: 'end', nowMs: T0 + 5000 },
    ] as const)('Then $type should not change the state', (action) => {
      expect(workoutFlowReducer(state, action)).toEqual(state)
    })
  })
})

describe('Given each step of the timer of prancha', () => {
  const ONE_SET_PRANCHA = { ...PRANCHA, sets: 1 }
  const counting = next(createWorkoutFlow(sessionOf([PRANCHA])), T0)
  const timing = timerReach(counting, T0 + 3000)

  describe.each([
    { name: 'the count opens', state: counting, text: '' },
    { name: 'the execution begins', state: timing, text: 'Começou' },
    {
      name: 'the execution ends by the clock, with a rest',
      state: timerReach(timing, T0 + 48_000),
      text: 'Série 1 de 3 registrada',
    },
    {
      name: 'next ends the execution early, with a rest',
      state: next(timing, T0 + 20_000),
      text: 'Série 1 de 3 registrada',
    },
    {
      name: 'the execution ends by the clock, with a 0 s rest',
      state: timerReach(
        next(createWorkoutFlow(sessionOf([{ ...PRANCHA, restSeconds: 0 }])), T0),
        T0 + 48_000,
      ),
      text: 'Série 1 de 3 registrada. Série 2 de 3',
    },
    {
      name: 'the execution ends by the clock on the last set of the letter',
      state: timerReach(next(createWorkoutFlow(sessionOf([ONE_SET_PRANCHA])), T0), T0 + 48_000),
      text: 'Série 1 de 1 registrada. Treino concluído',
    },
    {
      name: 'the athlete cancels',
      state: cancel(timing, T0 + 20_000),
      text: 'Prancha, série 1 de 3',
    },
  ])('When announcementOf is read after $name', ({ state, text }) => {
    it(`Then should say "${text}"`, () => {
      expect(announcementOf(state)).toBe(text)
    })
  })
})

describe('Given a state saved during the execution of prancha, begun at T0 + 3000 ms', () => {
  const { executionStartsAtMs: _omitted, ...savedWithoutInstant } = timerReach(
    next(createWorkoutFlow(sessionOf([PRANCHA])), T0),
    T0 + 3000,
  )
  const saved = timerReach(next(createWorkoutFlow(sessionOf([PRANCHA])), T0), T0 + 3000)

  describe('When it is restored at T0 + 90000 ms', () => {
    const restored = restoreWorkoutFlow(saved, T0 + 90_000)

    it('Then should stay in the execution with no set recorded and no tap guard', () => {
      expect({
        phase: restored.phase,
        executionStartsAtMs: restored.executionStartsAtMs,
        recorded: restored.recorded.length,
        lastStepAtMs: restored.lastStepAtMs,
      }).toEqual({
        phase: 'timing',
        executionStartsAtMs: T0 + 3000,
        recorded: 0,
        lastStepAtMs: null,
      })
    })

    it('Then the next timerReach should record the set at the calculated end', () => {
      expect(timerReach(restored, T0 + 90_000).recorded[0]?.performedAt).toBe(
        new Date(T0 + 48_000).toISOString(),
      )
    })
  })

  describe('When a state saved before this story, with no instant, is restored', () => {
    it('Then executionStartsAtMs should be null', () => {
      const restored = restoreWorkoutFlow(savedWithoutInstant as WorkoutFlowState, T0)

      expect(restored.executionStartsAtMs).toBeNull()
    })
  })
})

describe('Given the timer of prancha opened at T0, begun at T0 + 3000 ms', () => {
  const counting = next(createWorkoutFlow(sessionOf([PRANCHA])), T0)
  const timing = timerReach(counting, T0 + 3000)

  describe.each([
    { offsetMs: 0, stage: 'countdown', value: 3 },
    { offsetMs: 999, stage: 'countdown', value: 3 },
    { offsetMs: 1000, stage: 'countdown', value: 2 },
    { offsetMs: 2500, stage: 'countdown', value: 1 },
  ])('When the count is read at T0 + $offsetMs ms', ({ offsetMs, stage, value }) => {
    it(`Then should read ${value}`, () => {
      const reading = timerReadingOf(counting, T0 + offsetMs)

      expect({ stage: reading.stage, value: reading.value }).toEqual({ stage, value })
    })
  })

  describe.each([
    { offsetMs: 3000, value: 45 },
    { offsetMs: 18_500, value: 30 },
  ])('When the execution is read at T0 + $offsetMs ms', ({ offsetMs, value }) => {
    it(`Then should read ${value} s left`, () => {
      const reading = timerReadingOf(timing, T0 + offsetMs)

      expect({ stage: reading.stage, value: reading.value }).toEqual({
        stage: 'execution',
        value,
      })
    })
  })

  describe('When the flow is out of the timer', () => {
    it('Then the reading should be off', () => {
      expect(timerReadingOf(createWorkoutFlow(sessionOf([PRANCHA])), T0).stage).toBe('off')
    })
  })

  describe('When the deadline is read in each phase', () => {
    it('Then should be the end of the count, of the execution, of the rest, or null on a set', () => {
      expect({
        set: deadlineOf(createWorkoutFlow(sessionOf([PRANCHA]))),
        countdown: deadlineOf(counting),
        timing: deadlineOf(timing),
        rest: deadlineOf(timerReach(timing, T0 + 48_000)),
      }).toEqual({
        set: null,
        countdown: T0 + 3000,
        timing: T0 + 48_000,
        rest: T0 + 108_000,
      })
    })
  })
})

describe('Given the flow on set 1 of supino-reto, a rep exercise', () => {
  describe('When next arrives at T0', () => {
    it('Then should record the set at once, with no countdown', () => {
      const state = next(createWorkoutFlow(sessionOf()), T0)

      expect({ phase: state.phase, recorded: state.recorded.length }).toEqual({
        phase: 'rest',
        recorded: 1,
      })
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

  describe('When next arrives during the rest, at t + 800 ms', () => {
    it('Then set 2 should be ready at once, with no new set recorded and the step at t + 800', () => {
      const state = next(recorded, T0 + 800)

      expect({
        phase: state.phase,
        setNumber: state.setNumber,
        restEndsAtMs: state.restEndsAtMs,
        lastStepAtMs: state.lastStepAtMs,
        recorded: state.recorded.length,
      }).toEqual({
        phase: 'set',
        setNumber: 2,
        restEndsAtMs: null,
        lastStepAtMs: T0 + 800,
        recorded: 1,
      })
    })
  })

  describe('When the rest is skipped at t + 800 ms and a late restEnd arrives at t + 90 000 ms', () => {
    it('Then the late restEnd should not change the state', () => {
      const skipped = next(recorded, T0 + 800)

      expect(restEnd(skipped, T0 + 90_000)).toEqual(skipped)
    })
  })
})

describe('Given the flow back on the set phase with the last set recorded at t', () => {
  const onSet = { ...createWorkoutFlow(sessionOf()), setNumber: 2, lastStepAtMs: T0 }

  describe('When next arrives at t + 799 ms', () => {
    it('Then the state should not change', () => {
      expect(workoutFlowReducer(onSet, { type: 'next', nowMs: T0 + 799 })).toEqual(onSet)
    })
  })

  describe('When next arrives at t + 800 ms', () => {
    it('Then should record set 2', () => {
      const state = workoutFlowReducer(onSet, { type: 'next', nowMs: T0 + 800 })

      expect(state.recorded.map((body) => body.setNumber)).toEqual([2])
    })
  })
})

describe('Given set 1 of supino-reto recorded at T0, resting for 90 s', () => {
  const resting = next(createWorkoutFlow(sessionOf(LETTER_A)), T0)

  describe('When restEnd arrives at T0 + 90 000 ms', () => {
    it('Then set 2 of supino-reto should be ready, with no new set recorded and the step at T0 + 90 000', () => {
      const state = restEnd(resting, T0 + 90_000)

      expect({
        phase: state.phase,
        exerciseIndex: state.exerciseIndex,
        setNumber: state.setNumber,
        restEndsAtMs: state.restEndsAtMs,
        lastStepAtMs: state.lastStepAtMs,
        recorded: state.recorded.length,
      }).toEqual({
        phase: 'set',
        exerciseIndex: 0,
        setNumber: 2,
        restEndsAtMs: null,
        lastStepAtMs: T0 + 90_000,
        recorded: 1,
      })
    })
  })

  describe('When restEnd arrives at T0 + 89 999 ms', () => {
    it('Then the state should not change', () => {
      expect(restEnd(resting, T0 + 89_999)).toEqual(resting)
    })
  })

  describe('When restEnd arrives late, at T0 + 95 000 ms, back from the background', () => {
    it('Then the step should be at T0 + 95 000, the instant the screen changed', () => {
      expect(restEnd(resting, T0 + 95_000).lastStepAtMs).toBe(T0 + 95_000)
    })
  })
})

// Sets 1 to 3 of supino-reto recorded, each rest ending on time and the next tap 1 s later.
function supinoSet3RecordedAt(): { state: WorkoutFlowState; recordedAtMs: number } {
  let state = next(createWorkoutFlow(sessionOf(LETTER_A)), T0)
  state = next(restEnd(state, T0 + 90_000), T0 + 91_000)
  state = next(restEnd(state, T0 + 181_000), T0 + 182_000)
  return { state, recordedAtMs: T0 + 182_000 }
}

describe('Given set 3 of supino-reto, the last of the exercise, recorded at t', () => {
  const { state: resting, recordedAtMs } = supinoSet3RecordedAt()

  describe('When restEnd arrives when the 90 s rest of supino-reto ends', () => {
    it('Then set 1 of triceps-polia should be ready', () => {
      const state = restEnd(resting, recordedAtMs + 90_000)

      expect({
        restEndsAtMs: resting.restEndsAtMs,
        phase: state.phase,
        exerciseIndex: state.exerciseIndex,
        setNumber: state.setNumber,
      }).toEqual({
        restEndsAtMs: recordedAtMs + 90_000,
        phase: 'set',
        exerciseIndex: 1,
        setNumber: 1,
      })
    })
  })
})

describe.each([
  {
    passage: 'the end of the rest',
    atSet2: (t: number) => restEnd(next(createWorkoutFlow(sessionOf(LETTER_A)), t - 90_000), t),
  },
  {
    passage: 'a skip of the rest',
    atSet2: (t: number) => next(next(createWorkoutFlow(sessionOf(LETTER_A)), t - 1000), t),
  },
])('Given set 2 of supino-reto ready at t after $passage', ({ atSet2 }) => {
  const onSet2 = atSet2(T0)

  describe('When next arrives at t + 799 ms', () => {
    it('Then no set should be recorded', () => {
      expect(next(onSet2, T0 + 799).recorded.length).toBe(1)
    })
  })

  describe('When next arrives at t + 800 ms', () => {
    it('Then set 2 should be recorded', () => {
      expect(next(onSet2, T0 + 800).recorded.map((body) => body.setNumber)).toEqual([1, 2])
    })
  })
})

const NO_REST_SUPINO = { ...SUPINO_RETO, restSeconds: 0 }

describe('Given set 1 of an exercise with 3 sets and restSeconds 0', () => {
  describe('When next arrives', () => {
    it('Then set 1 should be recorded and set 2 should be ready with no rest', () => {
      const state = next(createWorkoutFlow(sessionOf([NO_REST_SUPINO, TRICEPS_POLIA])), T0)

      expect({
        recorded: state.recorded.map((body) => body.setNumber),
        phase: state.phase,
        setNumber: state.setNumber,
        restEndsAtMs: state.restEndsAtMs,
      }).toEqual({ recorded: [1], phase: 'set', setNumber: 2, restEndsAtMs: null })
    })
  })
})

// The 3 sets of supino-reto and sets 1 and 2 of triceps-polia already recorded and set 3, the last
// of the day, on screen.
function tricepsSet3(t: number): WorkoutFlowState {
  const onTriceps = recordSets(createWorkoutFlow(sessionOf(LETTER_A)), 3, t - 400_000).state
  return restEnd(next(restEnd(next(onTriceps, t - 122_000), t - 62_000), t - 61_000), t - 1000)
}

describe('Given set 3 of triceps-polia, the last set of the day', () => {
  const onLastSet = tricepsSet3(T0)

  describe('When next arrives', () => {
    it('Then set 3 should be recorded with 12 reps and 20000 g, and the workout should be finished with no rest', () => {
      const state = next(onLastSet, T0)
      const last = state.recorded.at(-1)

      expect({
        setNumber: last?.setNumber,
        reps: last?.reps,
        loadG: last?.loadG,
        phase: state.phase,
        restEndsAtMs: state.restEndsAtMs,
      }).toEqual({ setNumber: 3, reps: 12, loadG: 20000, phase: 'finished', restEndsAtMs: null })
    })
  })

  describe.each([
    { action: 'next', type: 'next' as const },
    { action: 'restEnd', type: 'restEnd' as const },
  ])('When $action arrives 2 min after the workout finished', ({ type }) => {
    it('Then the state should not change', () => {
      const finished = next(onLastSet, T0)

      expect(workoutFlowReducer(finished, { type, nowMs: T0 + 120_000 })).toEqual(finished)
    })
  })
})

describe.each([
  { letter: 'one exercise of one set', exercise: { ...TRICEPS_POLIA, sets: 1 } },
  {
    letter: 'one exercise of one set with restSeconds 0',
    exercise: { ...TRICEPS_POLIA, sets: 1, restSeconds: 0 },
  },
])('Given a letter with $letter', ({ exercise }) => {
  describe('When the first next arrives', () => {
    it('Then set 1 should be recorded and the workout should be finished', () => {
      const state = next(createWorkoutFlow(sessionOf([exercise])), T0)

      expect({
        recorded: state.recorded.map((body) => body.setNumber),
        phase: state.phase,
        restEndsAtMs: state.restEndsAtMs,
      }).toEqual({ recorded: [1], phase: 'finished', restEndsAtMs: null })
    })
  })
})

describe('Given the rest after set 3 of supino-reto', () => {
  describe('When the screen asks what comes next', () => {
    it('Then should answer triceps-polia', () => {
      expect(upcomingExercise(supinoSet3RecordedAt().state)?.exercise.name).toBe('Tríceps na polia')
    })
  })
})

describe.each([
  {
    moment: 'the rest after set 1 of supino-reto',
    state: () => next(createWorkoutFlow(sessionOf(LETTER_A)), T0),
  },
  { moment: 'set 1 of supino-reto on screen', state: () => createWorkoutFlow(sessionOf(LETTER_A)) },
])('Given $moment', ({ state }) => {
  describe('When the screen asks what comes next', () => {
    it('Then should answer null', () => {
      expect(upcomingExercise(state())).toBeNull()
    })
  })
})

describe.each([
  {
    moment: 'the workout screen just opened',
    state: () => createWorkoutFlow(sessionOf(LETTER_A)),
    text: '',
  },
  {
    moment: 'set 1 of supino-reto recorded and the rest started',
    state: () => next(createWorkoutFlow(sessionOf(LETTER_A)), T0),
    text: 'Série 1 de 3 registrada',
  },
  {
    moment: 'the end of the rest after set 1 of supino-reto',
    state: () => restEnd(next(createWorkoutFlow(sessionOf(LETTER_A)), T0), T0 + 90_000),
    text: 'Série 2 de 3',
  },
  {
    moment: 'a skip of the rest after set 1 of supino-reto',
    state: () => next(next(createWorkoutFlow(sessionOf(LETTER_A)), T0), T0 + 1000),
    text: 'Série 2 de 3',
  },
  {
    moment: 'the end of the rest after set 3 of supino-reto',
    state: () => {
      const { state, recordedAtMs } = supinoSet3RecordedAt()
      return restEnd(state, recordedAtMs + 90_000)
    },
    text: 'Tríceps na polia, série 1 de 3',
  },
  {
    moment: 'set 1 recorded on an exercise with restSeconds 0',
    state: () => next(createWorkoutFlow(sessionOf([NO_REST_SUPINO, TRICEPS_POLIA])), T0),
    text: 'Série 1 de 3 registrada. Série 2 de 3',
  },
  {
    moment: 'set 3 of triceps-polia recorded, the last of the day',
    state: () => next(tricepsSet3(T0), T0),
    text: 'Série 3 de 3 registrada. Treino concluído',
  },
])('Given $moment', ({ state, text }) => {
  describe('When the screen asks what to announce', () => {
    it(`Then should answer "${text}"`, () => {
      expect(announcementOf(state())).toBe(text)
    })
  })
})

describe('Given a saved state resting on supino-reto set 1 for 90 s', () => {
  const saved = next(createWorkoutFlow(sessionOf(LETTER_A)), T0)

  describe('When restoreWorkoutFlow runs after the rest ended while the app was closed', () => {
    it('Then the phase should be set on set 2 with no double-tap guard', () => {
      const state = restoreWorkoutFlow(saved, T0 + 120_000)

      expect({
        phase: state.phase,
        exerciseIndex: state.exerciseIndex,
        setNumber: state.setNumber,
        restEndsAtMs: state.restEndsAtMs,
        lastStepAtMs: state.lastStepAtMs,
        lastStep: state.lastStep,
        recorded: state.recorded.length,
      }).toEqual({
        phase: 'set',
        exerciseIndex: 0,
        setNumber: 2,
        restEndsAtMs: null,
        lastStepAtMs: null,
        lastStep: null,
        recorded: 1,
      })
    })
  })

  describe('When restoreWorkoutFlow runs with 40 s of rest left', () => {
    it('Then should keep the rest end and clear the double-tap guard', () => {
      const state = restoreWorkoutFlow(saved, T0 + 50_000)

      expect({
        phase: state.phase,
        restEndsAtMs: state.restEndsAtMs,
        lastStepAtMs: state.lastStepAtMs,
        lastStep: state.lastStep,
      }).toEqual({ phase: 'rest', restEndsAtMs: T0 + 90_000, lastStepAtMs: null, lastStep: null })
    })
  })

  describe('When restoreWorkoutFlow runs exactly when the rest ends', () => {
    it('Then the phase should be set on set 2', () => {
      expect(restoreWorkoutFlow(saved, T0 + 90_000)).toMatchObject({ phase: 'set', setNumber: 2 })
    })
  })
})

// Letter 'A' of the US-F03-04 fixture: supino-reto, crucifixo and triceps-polia, 3 sets each.
const THREE_EXERCISES = [SUPINO_RETO, CRUCIFIXO, TRICEPS_POLIA]

const STEP_MS = 1000

// Records the given number of sets of the current exercise the athlete is on, skipping each rest
// with next, one second apart. Returns the state and the clock after the last tap.
function recordSets(state: WorkoutFlowState, count: number, fromMs: number) {
  let current = state
  let clock = fromMs
  for (let index = 0; index < count; index++) {
    current = next(current, clock)
    clock += STEP_MS
    if (current.phase === 'countdown') {
      // A timed exercise ends by the clock, at the end of the execution.
      const targetSeconds = currentExercise(current).targetSeconds as number
      clock = (current.executionStartsAtMs as number) + targetSeconds * 1000
      current = timerReach(current, clock)
      clock += STEP_MS
    }
    if (current.phase === 'rest') {
      current = next(current, clock)
      clock += STEP_MS
    }
  }
  return { state: current, clock }
}

describe('Given the 3 sets of supino-reto recorded and the athlete on set 1 of crucifixo', () => {
  describe('When the sequence and the progress of the exercises are read', () => {
    it('Then should list supino-reto as done 3 of 3, crucifixo as current 0 of 3 and triceps-polia as to do 0 of 3, with the progress at 2', () => {
      const { state } = recordSets(createWorkoutFlow(sessionOf(THREE_EXERCISES)), 3, T0)

      expect({ sequence: sequenceOf(state), progress: exerciseProgressOf(state) }).toEqual({
        sequence: [
          {
            exerciseIndex: 0,
            name: 'Supino reto',
            status: 'done',
            setsDone: 3,
            setsTotal: 3,
            recordedSets: [
              { setNumber: 1, loadG: 42500, reps: 10 },
              { setNumber: 2, loadG: 42500, reps: 10 },
              { setNumber: 3, loadG: 42500, reps: 10 },
            ],
          },
          {
            exerciseIndex: 1,
            name: 'Crucifixo',
            status: 'current',
            setsDone: 0,
            setsTotal: 3,
            recordedSets: [],
          },
          {
            exerciseIndex: 2,
            name: 'Tríceps na polia',
            status: 'todo',
            setsDone: 0,
            setsTotal: 3,
            recordedSets: [],
          },
        ],
        progress: 2,
      })
    })
  })
})

describe('Given the rest right after the 3rd set of supino-reto, with crucifixo coming next', () => {
  describe('When the sequence and the progress of the exercises are read', () => {
    it('Then the current exercise should be crucifixo, the one that shows when the rest ends', () => {
      const flow = createWorkoutFlow(sessionOf(THREE_EXERCISES))
      const resting = next(recordSets(flow, 2, T0).state, T0 + 10_000)

      expect({
        phase: resting.phase,
        statuses: sequenceOf(resting).map(({ status }) => status),
        progress: exerciseProgressOf(resting),
      }).toEqual({ phase: 'rest', statuses: ['done', 'current', 'todo'], progress: 2 })
    })
  })
})

describe('Given the workout finished after the last set of the letter', () => {
  describe('When the progress of the exercises is read', () => {
    it('Then should be the total of 2 exercises, with every exercise done and none current', () => {
      const finished = next(tricepsSet3(T0), T0)

      expect({
        phase: finished.phase,
        statuses: sequenceOf(finished).map(({ status }) => status),
        progress: exerciseProgressOf(finished),
      }).toEqual({ phase: 'finished', statuses: ['done', 'done'], progress: 2 })
    })
  })
})

function goTo(state: WorkoutFlowState, exerciseIndex: number, nowMs: number): WorkoutFlowState {
  return workoutFlowReducer(state, { type: 'goTo', exerciseIndex, nowMs })
}

describe('Given 1 set of supino-reto recorded and the rest over, with the letter supino-reto, crucifixo and triceps-polia', () => {
  const afterRest = recordSets(createWorkoutFlow(sessionOf(THREE_EXERCISES)), 1, T0)
  const goToMs = afterRest.clock + 5000

  describe('When goTo arrives for triceps-polia', () => {
    it('Then should show set 1 of triceps-polia with 20 kg and 12 reps, announce it and take the step at nowMs', () => {
      const state = goTo(afterRest.state, 2, goToMs)

      expect({
        exerciseIndex: state.exerciseIndex,
        setNumber: state.setNumber,
        phase: state.phase,
        loadG: currentExercise(state).loadG,
        targetReps: currentExercise(state).targetReps,
        lastStep: state.lastStep,
        lastStepAtMs: state.lastStepAtMs,
        announcement: announcementOf(state),
      }).toEqual({
        exerciseIndex: 2,
        setNumber: 1,
        phase: 'set',
        loadG: 20000,
        targetReps: 12,
        lastStep: 'goTo',
        lastStepAtMs: goToMs,
        announcement: 'Tríceps na polia, série 1 de 3',
      })
    })
  })

  describe.each([
    { elapsedMs: 799, recordedCount: 1 },
    { elapsedMs: 800, recordedCount: 2 },
  ])('When next arrives $elapsedMs ms after the goTo', ({ elapsedMs, recordedCount }) => {
    it(`Then should leave ${recordedCount} set recorded`, () => {
      const state = next(goTo(afterRest.state, 2, goToMs), goToMs + elapsedMs)

      expect(state.recorded.length).toBe(recordedCount)
    })
  })
})

describe('Given the 3 sets of supino-reto recorded and set 1 of crucifixo on screen', () => {
  const onCrucifixo = recordSets(createWorkoutFlow(sessionOf(THREE_EXERCISES)), 3, T0)

  describe.each([
    { target: 'the exercise done', exerciseIndex: 0 },
    { target: 'the exercise on screen', exerciseIndex: 1 },
    { target: 'an index outside the letter', exerciseIndex: 7 },
    { target: 'a negative index', exerciseIndex: -1 },
  ])('When goTo arrives for $target', ({ exerciseIndex }) => {
    it('Then the state should not change', () => {
      expect(goTo(onCrucifixo.state, exerciseIndex, onCrucifixo.clock + 5000)).toEqual(
        onCrucifixo.state,
      )
    })
  })
})

describe('Given 1 set of supino-reto recorded and the athlete moved to triceps-polia', () => {
  const moved = (() => {
    const afterRest = recordSets(createWorkoutFlow(sessionOf(THREE_EXERCISES)), 1, T0)
    return goTo(afterRest.state, 2, afterRest.clock + 5000)
  })()

  describe('When goTo arrives for supino-reto, which has 2 sets left', () => {
    it('Then should show set 2 of supino-reto, the recorded sets plus 1', () => {
      const state = goTo(moved, 0, (moved.lastStepAtMs as number) + 5000)

      expect({
        exerciseIndex: state.exerciseIndex,
        setNumber: state.setNumber,
        announcement: announcementOf(state),
      }).toEqual({ exerciseIndex: 0, setNumber: 2, announcement: 'Supino reto, série 2 de 3' })
    })
  })
})

describe('Given 1 set of supino-reto recorded and the athlete moved to triceps-polia with 2 of its sets recorded', () => {
  const afterRest = recordSets(createWorkoutFlow(sessionOf(THREE_EXERCISES)), 1, T0)
  const moved = goTo(afterRest.state, 2, afterRest.clock + 5000)
  const onLastTricepsSet = recordSets(moved, 2, (moved.lastStepAtMs as number) + 1000)

  describe('When the 3rd set of triceps-polia is recorded', () => {
    it('Then should rest for 60 s with supino-reto as upcoming, and after restEnd show set 2 of supino-reto announced with its name', () => {
      const recordedAtMs = onLastTricepsSet.clock + 1000
      const resting = next(onLastTricepsSet.state, recordedAtMs)
      const back = restEnd(resting, recordedAtMs + 60_000)

      expect({
        restEndsAtMs: resting.restEndsAtMs,
        upcoming: upcomingExercise(resting)?.exercise.name,
        exerciseIndex: back.exerciseIndex,
        setNumber: back.setNumber,
        announcement: announcementOf(back),
      }).toEqual({
        restEndsAtMs: recordedAtMs + 60_000,
        upcoming: 'Supino reto',
        exerciseIndex: 0,
        setNumber: 2,
        announcement: 'Supino reto, série 2 de 3',
      })
    })
  })
})

describe('Given the 90 s rest after set 1 of supino-reto, with the letter supino-reto, crucifixo and triceps-polia', () => {
  const flow = createWorkoutFlow(sessionOf(THREE_EXERCISES))
  const resting = next(flow, T0)
  const restEndsAtMs = T0 + 90_000

  describe('When goTo arrives for triceps-polia', () => {
    it('Then should keep the rest end and the announcement, and show triceps-polia as upcoming', () => {
      const state = goTo(resting, 2, T0 + 10_000)

      expect({
        phase: state.phase,
        restEndsAtMs: state.restEndsAtMs,
        lastStepAtMs: state.lastStepAtMs,
        announcement: announcementOf(state),
        upcoming: upcomingExercise(state)?.exercise.name,
      }).toEqual({
        phase: 'rest',
        restEndsAtMs,
        lastStepAtMs: resting.lastStepAtMs,
        announcement: announcementOf(resting),
        upcoming: 'Tríceps na polia',
      })
    })
  })

  describe.each([
    { how: 'the rest ends', step: (state: WorkoutFlowState) => restEnd(state, restEndsAtMs) },
    { how: 'next skips the rest', step: (state: WorkoutFlowState) => next(state, T0 + 20_000) },
  ])('When goTo arrives for triceps-polia and then $how', ({ step }) => {
    it('Then should show set 1 of triceps-polia with 20 kg and 12 reps', () => {
      const state = step(goTo(resting, 2, T0 + 10_000))

      expect({
        phase: state.phase,
        exerciseIndex: state.exerciseIndex,
        setNumber: state.setNumber,
        loadG: currentExercise(state).loadG,
        recorded: state.recorded.length,
        announcement: announcementOf(state),
      }).toEqual({
        phase: 'set',
        exerciseIndex: 2,
        setNumber: 1,
        loadG: 20000,
        recorded: 1,
        announcement: 'Tríceps na polia, série 1 de 3',
      })
    })
  })

  describe('When goTo arrives for crucifixo and then for triceps-polia', () => {
    it('Then the last pick should win', () => {
      const state = restEnd(goTo(goTo(resting, 1, T0 + 10_000), 2, T0 + 11_000), restEndsAtMs)

      expect(state.exerciseIndex).toBe(2)
    })
  })

  describe('When goTo arrives for triceps-polia and then for supino-reto again', () => {
    it('Then should undo the pick and leave the state as it was', () => {
      const state = goTo(goTo(resting, 2, T0 + 10_000), 0, T0 + 11_000)

      expect(state).toEqual(resting)
    })
  })

  describe.each([
    { target: 'supino-reto, the one the order brings', exerciseIndex: 0 },
    { target: 'an index outside the letter', exerciseIndex: 9 },
  ])('When goTo arrives for $target with no pick before', ({ exerciseIndex }) => {
    it('Then the state should not change', () => {
      expect(goTo(resting, exerciseIndex, T0 + 10_000)).toEqual(resting)
    })
  })
})

describe('Given the rest after the 3rd set of supino-reto, which finished the exercise', () => {
  const afterThird = next(
    recordSets(createWorkoutFlow(sessionOf(THREE_EXERCISES)), 2, T0).state,
    T0 + 10_000,
  )

  describe.each([{ action: 'goTo the exercise done', exerciseIndex: 0 }])(
    'When $action arrives',
    ({ exerciseIndex }) => {
      it('Then the state should not change', () => {
        expect(goTo(afterThird, exerciseIndex, T0 + 11_000)).toEqual(afterThird)
      })
    },
  )

  describe('When goTo arrives for triceps-polia', () => {
    it('Then should keep the rest of supino-reto and show triceps-polia as upcoming', () => {
      const state = goTo(afterThird, 2, T0 + 11_000)

      expect({
        restEndsAtMs: state.restEndsAtMs,
        upcoming: upcomingExercise(state)?.exercise.name,
      }).toEqual({ restEndsAtMs: afterThird.restEndsAtMs, upcoming: 'Tríceps na polia' })
    })
  })
})

function openSheet(state: WorkoutFlowState, sheet: 'sequence' | 'confirmEnd'): WorkoutFlowState {
  return workoutFlowReducer(state, { type: 'openSheet', sheet })
}

function closeSheet(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  return workoutFlowReducer(state, { type: 'closeSheet', nowMs })
}

describe.each([
  { sheet: 'confirmEnd' as const, name: 'the end confirmation' },
  { sheet: 'sequence' as const, name: 'the sequence sheet' },
])('Given $name open during the 90 s rest after set 1 of supino-reto', ({ sheet }) => {
  const resting = next(createWorkoutFlow(sessionOf(THREE_EXERCISES)), T0)
  const open = openSheet(resting, sheet)
  const restEndsAtMs = T0 + 90_000

  describe('When the clock passes the rest end and restEnd is dispatched', () => {
    it('Then the phase should stay rest', () => {
      expect(restEnd(open, restEndsAtMs + 5000).phase).toBe('rest')
    })
  })

  describe('When next arrives with the sheet open', () => {
    it('Then the rest should not be skipped and no set recorded', () => {
      const state = next(open, T0 + 10_000)

      expect({ phase: state.phase, recorded: state.recorded.length }).toEqual({
        phase: 'rest',
        recorded: 1,
      })
    })
  })

  describe('When closeSheet arrives after the rest end', () => {
    it('Then the next set should show with the step at the close and no set recorded', () => {
      const closeMs = restEndsAtMs + 5000
      const state = closeSheet(restEnd(open, restEndsAtMs + 2000), closeMs)

      expect({
        sheet: state.sheet,
        phase: state.phase,
        setNumber: state.setNumber,
        lastStepAtMs: state.lastStepAtMs,
        recorded: state.recorded.length,
      }).toEqual({ sheet: 'none', phase: 'set', setNumber: 2, lastStepAtMs: closeMs, recorded: 1 })
    })
  })

  describe('When closeSheet arrives before the rest end', () => {
    it('Then the rest should go on with the same end', () => {
      const state = closeSheet(open, T0 + 30_000)

      expect({ sheet: state.sheet, phase: state.phase, restEndsAtMs: state.restEndsAtMs }).toEqual({
        sheet: 'none',
        phase: 'rest',
        restEndsAtMs,
      })
    })
  })

  describe.each([
    { elapsedMs: 799, recordedCount: 1 },
    { elapsedMs: 800, recordedCount: 2 },
  ])(
    'When next arrives $elapsedMs ms after closeSheet passed to the set',
    ({ elapsedMs, recordedCount }) => {
      it(`Then should leave ${recordedCount} set recorded`, () => {
        const closeMs = restEndsAtMs + 5000
        const passed = closeSheet(open, closeMs)

        expect(next(passed, closeMs + elapsedMs).recorded.length).toBe(recordedCount)
      })
    },
  )
})

describe('Given set 2 of supino-reto on screen', () => {
  const onSet = recordSets(createWorkoutFlow(sessionOf(THREE_EXERCISES)), 1, T0)

  describe('When the sequence sheet opens', () => {
    it('Then the phase, the set and the clock of the step should stay as they were', () => {
      const state = openSheet(onSet.state, 'sequence')

      expect({ ...state, sheet: 'none' }).toEqual(onSet.state)
    })
  })
})

describe('Given the workout finished', () => {
  const finished = next(tricepsSet3(T0), T0)

  describe('When the sequence sheet opens and closes', () => {
    it('Then should end on the finished phase with the sheet closed', () => {
      const state = closeSheet(openSheet(finished, 'sequence'), T0 + 5000)

      expect({ phase: state.phase, sheet: state.sheet }).toEqual({
        phase: 'finished',
        sheet: 'none',
      })
    })
  })
})

function end(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  return workoutFlowReducer(state, { type: 'end', nowMs })
}

// 4 of the 9 sets recorded: the 3 of supino-reto and set 1 of crucifixo, which is on screen.
const FOUR_OF_NINE = recordSets(createWorkoutFlow(sessionOf(THREE_EXERCISES)), 4, T0)

describe('Given 4 of 9 sets recorded', () => {
  describe('When end arrives at the instant of the tap', () => {
    it('Then the phase should be ended and finish should be ended_early at that instant', () => {
      const tapMs = FOUR_OF_NINE.clock + 7000
      const state = end(FOUR_OF_NINE.state, tapMs)

      expect({ phase: state.phase, finish: state.finish }).toEqual({
        phase: 'ended',
        finish: { finishedAt: new Date(tapMs).toISOString(), endReason: 'ended_early' },
      })
    })
  })

  describe('When end arrives during the rest after the 5th set', () => {
    it('Then the rest should stop and the phase should be ended', () => {
      const resting = next(FOUR_OF_NINE.state, FOUR_OF_NINE.clock)
      const state = end(resting, FOUR_OF_NINE.clock + 5000)

      expect({
        phase: state.phase,
        restEndsAtMs: state.restEndsAtMs,
        sets: state.recorded.length,
      }).toEqual({
        phase: 'ended',
        restEndsAtMs: null,
        sets: 5,
      })
    })
  })
})

describe('Given the flow with no set recorded', () => {
  describe('When end arrives', () => {
    it('Then the phase should be ended with no finish', () => {
      const state = end(createWorkoutFlow(sessionOf(THREE_EXERCISES)), T0)

      expect({ phase: state.phase, finish: state.finish }).toEqual({ phase: 'ended', finish: null })
    })
  })
})

describe('Given the last missing set of the letter, reached out of the order', () => {
  describe('When it is recorded', () => {
    it('Then the workout should be finished with no rest and finish completed at the performedAt of that set', () => {
      const afterSupino = recordSets(createWorkoutFlow(sessionOf(THREE_EXERCISES)), 3, T0)
      const onTriceps = goTo(afterSupino.state, 2, afterSupino.clock + 1000)
      const afterTriceps = recordSets(onTriceps, 3, afterSupino.clock + 3000)
      const onLastSets = recordSets(afterTriceps.state, 2, afterTriceps.clock)
      const state = next(onLastSets.state, onLastSets.clock + 1000)

      expect({
        phase: state.phase,
        restEndsAtMs: state.restEndsAtMs,
        finish: state.finish,
        lastPerformedAt: state.recorded.at(-1)?.performedAt,
      }).toEqual({
        phase: 'finished',
        restEndsAtMs: null,
        finish: { finishedAt: state.recorded.at(-1)?.performedAt, endReason: 'completed' },
        lastPerformedAt: new Date(onLastSets.clock + 1000).toISOString(),
      })
    })
  })
})

describe('Given the workout finished on its last set', () => {
  describe('When end arrives', () => {
    it('Then finish should stay completed', () => {
      const finished = next(tricepsSet3(T0), T0)

      expect(end(finished, T0 + 5000)).toEqual(finished)
    })
  })
})

describe('Given a state saved by the previous version, with no pick, sheet or finish fields', () => {
  const {
    nextExerciseIndex: _pick,
    sheet: _sheet,
    finish: _finish,
    ...legacy
  } = next(createWorkoutFlow(sessionOf(THREE_EXERCISES)), T0)

  describe('When restoreWorkoutFlow runs with the rest still counting', () => {
    it('Then should come back with nextExerciseIndex null, sheet none and finish null', () => {
      const state = restoreWorkoutFlow(legacy as unknown as WorkoutFlowState, T0 + 10_000)

      expect({
        nextExerciseIndex: state.nextExerciseIndex,
        sheet: state.sheet,
        finish: state.finish,
        phase: state.phase,
      }).toEqual({ nextExerciseIndex: null, sheet: 'none', finish: null, phase: 'rest' })
    })
  })
})

describe('Given a state saved with a pick of triceps-polia and the end confirmation open', () => {
  const saved = openSheet(
    goTo(next(createWorkoutFlow(sessionOf(THREE_EXERCISES)), T0), 2, T0 + 5000),
    'confirmEnd',
  )

  describe('When restoreWorkoutFlow runs with the rest still counting', () => {
    it('Then should keep the pick and close the sheet', () => {
      const state = restoreWorkoutFlow(saved, T0 + 10_000)

      expect({ nextExerciseIndex: state.nextExerciseIndex, sheet: state.sheet }).toEqual({
        nextExerciseIndex: 2,
        sheet: 'none',
      })
    })
  })

  describe('When restoreWorkoutFlow runs after the rest ended with the app closed', () => {
    it('Then should show set 1 of triceps-polia on the set phase with the sheet closed', () => {
      const state = restoreWorkoutFlow(saved, T0 + 120_000)

      expect({
        phase: state.phase,
        exerciseIndex: state.exerciseIndex,
        sheet: state.sheet,
      }).toEqual({
        phase: 'set',
        exerciseIndex: 2,
        sheet: 'none',
      })
    })
  })
})

describe.each([
  { moment: 'ended', state: () => end(FOUR_OF_NINE.state, T0 + 60_000) },
  { moment: 'finished', state: () => next(tricepsSet3(T0), T0) },
])('Given a state saved in the $moment phase', ({ state }) => {
  describe('When restoreWorkoutFlow runs', () => {
    it('Then should come back in the same phase with the same finish', () => {
      const saved = state()
      const restored = restoreWorkoutFlow(saved, T0 + 120_000)

      expect({ phase: restored.phase, finish: restored.finish }).toEqual({
        phase: saved.phase,
        finish: saved.finish,
      })
    })
  })
})

// Letter 'A' of the US-F03-05 spec: supino-reto, prancha (time) and triceps-polia.
const SKIP_LETTER = [SUPINO_RETO, PRANCHA, TRICEPS_POLIA]

function skip(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  return workoutFlowReducer(state, { type: 'skip', nowMs })
}

// The 3 sets of supino-reto recorded and set 1 of prancha on screen, out of the rest.
function onPranchaAfterSupino() {
  return recordSets(createWorkoutFlow(sessionOf(SKIP_LETTER)), 3, T0)
}

describe('Given the 3 sets of supino-reto recorded and set 1 of prancha on screen, out of the rest', () => {
  const { state: onPrancha, clock } = onPranchaAfterSupino()

  describe('When skip arrives', () => {
    it('Then should show set 1 of triceps-polia with 20 kg and 12 reps, mark prancha as skipped at the tap instant and announce it', () => {
      const state = skip(onPrancha, clock)

      expect({
        phase: state.phase,
        exercise: currentExercise(state).exercise.name,
        setNumber: state.setNumber,
        loadG: currentExercise(state).loadG,
        targetReps: currentExercise(state).targetReps,
        skipped: state.skipped,
        announcement: announcementOf(state),
      }).toEqual({
        phase: 'set',
        exercise: 'Tríceps na polia',
        setNumber: 1,
        loadG: 20000,
        targetReps: 12,
        skipped: [
          { plannedExerciseId: 'planned-prancha', skippedAt: new Date(clock).toISOString() },
        ],
        announcement: 'Tríceps na polia, série 1 de 3',
      })
    })
  })

  describe('When skip arrives and next follows within 0.8 s', () => {
    it('Then the next should record nothing', () => {
      const skipped = skip(onPrancha, clock)

      const state = next(skipped, clock + 500)

      expect(state.recorded.length).toBe(skipped.recorded.length)
    })
  })
})

describe('Given prancha skipped and set 1 of triceps-polia on screen', () => {
  const { state: onPrancha, clock } = onPranchaAfterSupino()
  const onTriceps = skip(onPrancha, clock)

  describe('When sequenceOf and exerciseProgressOf are read', () => {
    it('Then should list supino-reto done 3 of 3, prancha skipped 0 of 3 and triceps-polia current 0 of 3, with progress 2', () => {
      expect({
        sequence: sequenceOf(onTriceps).map(({ name, status, setsDone, setsTotal }) => ({
          name,
          status,
          setsDone,
          setsTotal,
        })),
        progress: exerciseProgressOf(onTriceps),
      }).toEqual({
        sequence: [
          { name: 'Supino reto', status: 'done', setsDone: 3, setsTotal: 3 },
          { name: 'Prancha', status: 'skipped', setsDone: 0, setsTotal: 3 },
          { name: 'Tríceps na polia', status: 'current', setsDone: 0, setsTotal: 3 },
        ],
        progress: 2,
      })
    })
  })

  describe('When canSkipOf is read', () => {
    it('Then should be true while another exercise still has sets to do', () => {
      expect(canSkipOf(onPrancha)).toBe(true)
    })
  })
})

describe('Given no other exercise with sets left that is not skipped', () => {
  describe.each([
    {
      name: 'supino-reto and triceps-polia done and prancha on screen',
      build: () => {
        const afterSupino = recordSets(
          createWorkoutFlow(sessionOf([SUPINO_RETO, TRICEPS_POLIA, PRANCHA])),
          3,
          T0,
        )
        return recordSets(afterSupino.state, 3, afterSupino.clock).state
      },
    },
    {
      name: 'prancha skipped and triceps-polia on screen',
      build: () => {
        const { state, clock } = onPranchaAfterSupino()
        return skip(state, clock)
      },
    },
    {
      name: 'the workout finished on its last set',
      build: () => recordSets(createWorkoutFlow(sessionOf([SUPINO_RETO, PRANCHA])), 6, T0).state,
    },
  ])('When canSkipOf is read with $name', ({ build }) => {
    it('Then should be false', () => {
      expect(canSkipOf(build())).toBe(false)
    })
  })
})

// The 90 s rest after the 3rd set of supino-reto, with prancha as the upcoming exercise.
function restingAfterSupino() {
  const afterTwo = recordSets(createWorkoutFlow(sessionOf(SKIP_LETTER)), 2, T0)
  const recordedAtMs = afterTwo.clock
  return { state: next(afterTwo.state, recordedAtMs), recordedAtMs }
}

describe('Given the 90 s rest after the 3rd set of supino-reto with prancha as upcoming', () => {
  const { state: resting, recordedAtMs } = restingAfterSupino()

  describe('When skip arrives during the rest', () => {
    it('Then should keep restEndsAtMs and lastStepAtMs, skip prancha, make triceps-polia the upcoming exercise and announce it', () => {
      const state = skip(resting, recordedAtMs + 3000)

      expect({
        restEndsAtMs: state.restEndsAtMs,
        lastStepAtMs: state.lastStepAtMs,
        skipped: state.skipped.map((mark) => mark.plannedExerciseId),
        upcoming: upcomingExercise(state)?.exercise.name,
        announcement: announcementOf(state),
      }).toEqual({
        restEndsAtMs: resting.restEndsAtMs,
        lastStepAtMs: resting.lastStepAtMs,
        skipped: ['planned-prancha'],
        upcoming: 'Tríceps na polia',
        announcement: 'A seguir: Tríceps na polia',
      })
    })

    it('Then the end of the rest should show set 1 of triceps-polia', () => {
      const skipped = skip(resting, recordedAtMs + 3000)

      const state = restEnd(skipped, skipped.restEndsAtMs as number)

      expect({
        exercise: currentExercise(state).exercise.name,
        setNumber: state.setNumber,
      }).toEqual({ exercise: 'Tríceps na polia', setNumber: 1 })
    })
  })

  describe('When triceps-polia is picked in the sequence and skip arrives', () => {
    it('Then should skip the picked exercise, undo the pick and bring prancha by the order', () => {
      const picked = goTo(resting, 2, recordedAtMs + 2000)

      const state = skip(picked, recordedAtMs + 3000)

      expect({
        skipped: state.skipped.map((mark) => mark.plannedExerciseId),
        nextExerciseIndex: state.nextExerciseIndex,
        upcoming: upcomingExercise(state)?.exercise.name,
      }).toEqual({
        skipped: ['planned-triceps'],
        nextExerciseIndex: null,
        upcoming: 'Prancha',
      })
    })
  })

  describe('When prancha is skipped and then picked again during the rest', () => {
    it('Then the pick should count and the skipped mark should stay until a set is recorded', () => {
      const skipped = skip(resting, recordedAtMs + 3000)

      const picked = goTo(skipped, 1, recordedAtMs + 4000)

      const back = restEnd(picked, picked.restEndsAtMs as number)
      expect({
        exercise: currentExercise(back).exercise.name,
        setNumber: back.setNumber,
        skipped: back.skipped.map((mark) => mark.plannedExerciseId),
      }).toEqual({ exercise: 'Prancha', setNumber: 1, skipped: ['planned-prancha'] })
    })
  })
})

describe('Given prancha skipped and set 1 of triceps-polia on screen, for the mark of the skipped exercise', () => {
  const { state: onPrancha, clock } = onPranchaAfterSupino()
  const onTriceps = skip(onPrancha, clock)

  describe('When goTo arrives for prancha and next records its set', () => {
    it('Then prancha should no longer be skipped and should go on with set 2', () => {
      const onSkipped = goTo(onTriceps, 1, clock + 5000)
      const counting = next(onSkipped, clock + 6000)
      const recorded = timerReach(counting, (counting.executionStartsAtMs as number) + 45_000)

      const back = restEnd(recorded, recorded.restEndsAtMs as number)

      expect({
        skippedAfterGoTo: onSkipped.skipped.map((mark) => mark.plannedExerciseId),
        skippedAfterRecord: recorded.skipped,
        exercise: currentExercise(back).exercise.name,
        setNumber: back.setNumber,
      }).toEqual({
        skippedAfterGoTo: ['planned-prancha'],
        skippedAfterRecord: [],
        exercise: 'Prancha',
        setNumber: 2,
      })
    })
  })

  describe('When goTo arrives for prancha and then back for triceps-polia, with no set recorded', () => {
    it('Then the mark of prancha should stay', () => {
      const onSkipped = goTo(onTriceps, 1, clock + 5000)

      const state = goTo(onSkipped, 2, clock + 6000)

      expect(state.skipped.map((mark) => mark.plannedExerciseId)).toEqual(['planned-prancha'])
    })
  })

  describe('When skip arrives again for prancha, later', () => {
    it('Then should keep one mark with the new instant', () => {
      const onSkipped = goTo(onTriceps, 1, clock + 5000)

      const state = skip(onSkipped, clock + 9000)

      expect(state.skipped).toEqual([
        { plannedExerciseId: 'planned-prancha', skippedAt: new Date(clock + 9000).toISOString() },
      ])
    })
  })
})

describe('Given 1 set of supino-reto recorded and set 2 on screen', () => {
  describe('When skip arrives', () => {
    it('Then supino-reto should be skipped with 1 of 3 done', () => {
      const { state, clock } = recordSets(createWorkoutFlow(sessionOf(SKIP_LETTER)), 1, T0)

      const skipped = skip(state, clock)

      expect(sequenceOf(skipped)[0]).toMatchObject({
        name: 'Supino reto',
        status: 'skipped',
        setsDone: 1,
        setsTotal: 3,
      })
    })
  })
})

// Prancha skipped, supino-reto done and the 3rd set of triceps-polia on screen.
function onLastTricepsSetWithPranchaSkipped() {
  const { state, clock } = onPranchaAfterSupino()
  return recordSets(skip(state, clock), 2, clock + 1000)
}

describe('Given supino-reto 3 of 3, prancha skipped 0 of 3 and set 3 of triceps-polia on screen', () => {
  const { state: onLastSet, clock } = onLastTricepsSetWithPranchaSkipped()

  describe('When next records the set', () => {
    it('Then should finish with no rest, list prancha as left out and announce the end with it', () => {
      const state = next(onLastSet, clock)
      const performedAt = state.recorded.at(-1)?.performedAt

      expect({
        phase: state.phase,
        restEndsAtMs: state.restEndsAtMs,
        finish: state.finish,
        performedAt,
        leftOut: leftOutOf(state).map(({ name, setsDone, setsTotal, skippedAt }) => ({
          name,
          setsDone,
          setsTotal,
          skippedAt,
        })),
        progress: exerciseProgressOf(state),
        announcement: announcementOf(state),
      }).toEqual({
        phase: 'finished',
        restEndsAtMs: null,
        finish: { finishedAt: performedAt, endReason: 'completed' },
        performedAt: new Date(clock).toISOString(),
        leftOut: [
          {
            name: 'Prancha',
            setsDone: 0,
            setsTotal: 3,
            skippedAt: onLastSet.skipped[0]?.skippedAt,
          },
        ],
        progress: 2,
        announcement: 'Série 3 de 3 registrada. Treino concluído. Ficou de fora: Prancha',
      })
    })
  })

  describe('When end arrives before the last set', () => {
    it('Then the left out list should keep prancha', () => {
      const state = end(onLastSet, clock)

      expect(leftOutOf(state).map(({ name }) => name)).toEqual(['Prancha'])
    })
  })
})

describe('Given prancha skipped first and supino-reto skipped after, with triceps-polia on screen', () => {
  const afterGoTo = goTo(createWorkoutFlow(sessionOf(SKIP_LETTER)), 1, T0)
  const afterPrancha = skip(afterGoTo, T0 + 1000)
  const onTriceps = skip(afterPrancha, T0 + 2000)

  describe('When the 3 sets of triceps-polia are recorded', () => {
    it('Then should list both in the order of the program and announce the plural', () => {
      const { state, clock } = recordSets(onTriceps, 3, T0 + 3000)
      expect(state.phase).toBe('finished')

      expect({
        leftOut: leftOutOf(state).map(({ name }) => name),
        announcement: announcementOf(state),
        clock: clock > T0,
      }).toEqual({
        leftOut: ['Supino reto', 'Prancha'],
        announcement:
          'Série 3 de 3 registrada. Treino concluído. Ficaram de fora: Supino reto, Prancha',
        clock: true,
      })
    })
  })
})

describe('Given a state saved with no skipped field', () => {
  const { skipped: _skipped, ...legacy } = next(createWorkoutFlow(sessionOf(THREE_EXERCISES)), T0)

  describe('When restoreWorkoutFlow runs', () => {
    it('Then should come back with skipped empty', () => {
      const state = restoreWorkoutFlow(legacy as unknown as WorkoutFlowState, T0 + 10_000)

      expect(state.skipped).toEqual([])
    })
  })

  describe('When restoreWorkoutFlow runs after the rest ended with the app closed', () => {
    it('Then should show set 2 of supino-reto with skipped empty', () => {
      const state = restoreWorkoutFlow(legacy as unknown as WorkoutFlowState, T0 + 120_000)

      expect({ setNumber: state.setNumber, skipped: state.skipped }).toEqual({
        setNumber: 2,
        skipped: [],
      })
    })
  })
})

describe('Given a state saved with prancha skipped', () => {
  const { state: onPrancha, clock } = onPranchaAfterSupino()
  const saved = skip(onPrancha, clock)

  describe('When restoreWorkoutFlow runs', () => {
    it('Then should come back with the mark', () => {
      const state = restoreWorkoutFlow(saved, clock + 10_000)

      expect(state.skipped).toEqual(saved.skipped)
    })
  })
})

describe('Given the 3 sets of supino-reto recorded and set 1 of prancha on screen', () => {
  describe('When sequenceOf is read', () => {
    it('Then supino-reto should be done with recordedSets 1, 2 and 3 of 42500 g and 10 reps, and prancha and triceps-polia should have none', () => {
      const { state } = recordSets(createWorkoutFlow(sessionOf(SKIP_LETTER)), 3, T0)

      const [supino, prancha, triceps] = sequenceOf(state)

      expect({
        supino: { status: supino?.status, sets: supino?.recordedSets },
        prancha: prancha?.recordedSets,
        triceps: triceps?.recordedSets,
      }).toEqual({
        supino: {
          status: 'done',
          sets: [
            { setNumber: 1, loadG: 42500, reps: 10 },
            { setNumber: 2, loadG: 42500, reps: 10 },
            { setNumber: 3, loadG: 42500, reps: 10 },
          ],
        },
        prancha: [],
        triceps: [],
      })
    })
  })
})

describe('Given the 3 sets of supino-reto stored out of order in recorded', () => {
  describe('When sequenceOf is read', () => {
    it('Then recordedSets should list the sets by setNumber, 1, 2 and 3', () => {
      const { state } = recordSets(createWorkoutFlow(sessionOf(SKIP_LETTER)), 3, T0)
      const shuffled = { ...state, recorded: [...state.recorded].reverse() }

      expect(sequenceOf(shuffled)[0]?.recordedSets.map(({ setNumber }) => setNumber)).toEqual([
        1, 2, 3,
      ])
    })
  })
})

describe('Given the 3 sets of prancha recorded, with triceps-polia on screen', () => {
  describe('When sequenceOf is read', () => {
    it('Then prancha recordedSets should have 45 seconds and 0 g in each set and no reps', () => {
      const letter = [PRANCHA, TRICEPS_POLIA]
      const { state } = recordSets(createWorkoutFlow(sessionOf(letter)), 3, T0)

      expect(sequenceOf(state)[0]?.recordedSets).toEqual([
        { setNumber: 1, loadG: 0, seconds: 45 },
        { setNumber: 2, loadG: 0, seconds: 45 },
        { setNumber: 3, loadG: 0, seconds: 45 },
      ])
    })
  })
})

describe('Given 1 set of supino-reto recorded and set 2 on screen, read as a sequence', () => {
  describe('When sequenceOf is read', () => {
    it('Then supino-reto should be current with no recordedSets', () => {
      const { state } = recordSets(createWorkoutFlow(sessionOf(SKIP_LETTER)), 1, T0)

      expect(sequenceOf(state)[0]).toMatchObject({ status: 'current', recordedSets: [] })
    })
  })
})

describe('Given supino-reto skipped with 1 set recorded', () => {
  describe('When sequenceOf is read', () => {
    it('Then supino-reto should be skipped with no recordedSets', () => {
      const { state, clock } = recordSets(createWorkoutFlow(sessionOf(SKIP_LETTER)), 1, T0)

      expect(sequenceOf(skip(state, clock))[0]).toMatchObject({
        status: 'skipped',
        recordedSets: [],
      })
    })
  })
})

describe('Given triceps-polia done through the sequence before supino-reto, with supino-reto on screen', () => {
  describe('When sequenceOf is read', () => {
    it('Then triceps-polia should be done with 3 sets of 20000 g and 12 reps, and supino-reto current with none', () => {
      const flow = createWorkoutFlow(sessionOf(LETTER_A))
      const { state, clock } = recordSets(goTo(flow, 1, T0), 3, T0 + 1000)
      const onSupino = goTo(state, 0, clock)

      const [supino, triceps] = sequenceOf(onSupino)

      expect({ supino: supino?.recordedSets, triceps: triceps?.recordedSets }).toEqual({
        supino: [],
        triceps: [
          { setNumber: 1, loadG: 20000, reps: 12 },
          { setNumber: 2, loadG: 20000, reps: 12 },
          { setNumber: 3, loadG: 20000, reps: 12 },
        ],
      })
      expect(supino?.status).toBe('current')
    })
  })
})

describe('Given a set of supino-reto recorded at 45000 g while the program plans 40000 g', () => {
  describe('When sequenceOf is read after the 3 sets', () => {
    it('Then recordedSets should show the recorded 45000 g', () => {
      const shown = { ...SUPINO_RETO, loadG: 45000 }
      const { state } = recordSets(createWorkoutFlow(sessionOf([shown, PRANCHA])), 3, T0)

      expect(sequenceOf(state)[0]?.recordedSets.map(({ loadG }) => loadG)).toEqual([
        45000, 45000, 45000,
      ])
    })
  })
})

describe('Given the rest right after the 3rd set of supino-reto', () => {
  describe('When sequenceOf is read', () => {
    it('Then supino-reto should already be done with its 3 sets', () => {
      const flow = createWorkoutFlow(sessionOf(SKIP_LETTER))
      const resting = next(recordSets(flow, 2, T0).state, T0 + 10_000)

      expect({
        phase: resting.phase,
        sets: sequenceOf(resting)[0]?.recordedSets.map(({ setNumber }) => setNumber),
      }).toEqual({ phase: 'rest', sets: [1, 2, 3] })
    })
  })
})

describe('Given the workout finished after the last set of the letter, read as a sequence', () => {
  describe('When sequenceOf is read', () => {
    it('Then every exercise should be done with its 3 recorded sets', () => {
      const finished = next(tricepsSet3(T0), T0)

      expect({
        phase: finished.phase,
        setCounts: sequenceOf(finished).map(({ recordedSets }) => recordedSets.length),
      }).toEqual({ phase: 'finished', setCounts: [3, 3] })
    })
  })
})

describe('Given supino-reto skipped with 1 set and then done by the sequence', () => {
  describe('When sequenceOf is read', () => {
    it('Then supino-reto should be done with the 3 sets in order', () => {
      const first = recordSets(createWorkoutFlow(sessionOf(SKIP_LETTER)), 1, T0)
      const skipped = skip(first.state, first.clock)
      const back = goTo(skipped, 0, first.clock + 1000)
      const { state } = recordSets(back, 2, first.clock + 2000)

      expect(sequenceOf(state)[0]).toMatchObject({
        status: 'done',
        recordedSets: [{ setNumber: 1 }, { setNumber: 2 }, { setNumber: 3 }],
      })
    })
  })
})

describe('Given the flow on set 1 of supino-reto planned at 40 kg and 10 reps', () => {
  describe('When the athlete adjusts the shown values', () => {
    const flow = createWorkoutFlow(sessionOf([SUPINO_40, PRANCHA]))

    it('Then should show the filled values before any adjust', () => {
      expect(shownValuesOf(flow)).toEqual({ loadG: 40_000, reps: 10, seconds: null })
    })

    it('Then should show 42500 g after the load goes up one step', () => {
      expect(shownValuesOf(adjust(flow, 'loadG', 1)).loadG).toBe(42_500)
    })

    it('Then should show 8 reps after the reps go down two steps', () => {
      expect(shownValuesOf(adjust(flow, 'reps', -2)).reps).toBe(8)
    })

    it('Then should keep the phase, the sets and the step of the last tap', () => {
      const tapped = { ...flow, lastStepAtMs: T0, lastStep: 'advance' as const }
      const adjusted = adjust(tapped, 'loadG', 1)

      expect({
        phase: adjusted.phase,
        recorded: adjusted.recorded,
        lastStepAtMs: adjusted.lastStepAtMs,
        lastStep: adjusted.lastStep,
      }).toEqual({ phase: 'set', recorded: [], lastStepAtMs: T0, lastStep: 'advance' })
    })
  })
})

describe('Given the flow on set 1 of prancha planned at 45 s', () => {
  describe('When the athlete adjusts the shown values', () => {
    const flow = createWorkoutFlow(sessionOf([PRANCHA]))

    it('Then should show 50 s after the time goes up one step', () => {
      expect(shownValuesOf(adjust(flow, 'seconds', 1)).seconds).toBe(50)
    })

    it('Then should ignore the reps, which this exercise does not have', () => {
      expect(adjust(flow, 'reps', 1)).toBe(flow)
    })
  })
})

describe('Given the flow out of the set screen or with a sheet open', () => {
  describe('When an adjust arrives', () => {
    const onSet = createWorkoutFlow(sessionOf([SUPINO_40, PRANCHA]))
    const timed = createWorkoutFlow(sessionOf([PRANCHA]))
    const lastSet = createWorkoutFlow(sessionOf([{ ...SUPINO_40, sets: 1 }]))
    const states: [string, WorkoutFlowState][] = [
      ['rest', next(onSet, T0)],
      ['countdown', next(timed, T0)],
      ['timing', timerReach(next(timed, T0), T0 + 3_000)],
      ['finished', next(lastSet, T0)],
      ['sequence sheet', workoutFlowReducer(onSet, { type: 'openSheet', sheet: 'sequence' })],
      ['confirmEnd sheet', workoutFlowReducer(onSet, { type: 'openSheet', sheet: 'confirmEnd' })],
    ]

    it.each(states)('Then the %s state should come back the same', (_name, state) => {
      expect(adjust(state, 'loadG', 1)).toBe(state)
    })
  })
})

describe('Given supino-reto adjusted to 42500 g and 8 reps on set 1', () => {
  describe('When next arrives', () => {
    const adjusted = adjust(
      adjust(createWorkoutFlow(sessionOf([SUPINO_40, PRANCHA])), 'loadG', 1),
      'reps',
      -2,
    )

    it('Then should record the set with the shown 42500 g and 8 reps', () => {
      const [recorded] = next(adjusted, T0).recorded

      expect([recorded?.loadG, recorded?.reps]).toEqual([42_500, 8])
    })

    it('Then should record even when it arrives 100 ms after the adjust', () => {
      const tapped = { ...adjusted, lastStepAtMs: null }

      expect(next(tapped, T0 + 100).recorded).toHaveLength(1)
    })
  })
})

describe('Given set 1 of supino-reto recorded at 42500 g and 8 reps', () => {
  describe('When the rest ends', () => {
    const adjusted = adjust(
      adjust(createWorkoutFlow(sessionOf([SUPINO_40, PRANCHA])), 'loadG', 1),
      'reps',
      -2,
    )
    const onSet2 = restEnd(next(adjusted, T0), T0 + 90_000)

    it('Then set 2 should start from 42500 g and 8 reps', () => {
      expect(shownValuesOf(onSet2)).toEqual({ loadG: 42_500, reps: 8, seconds: null })
    })

    it('Then a set 2 adjusted to 45000 g and recorded should hand 45000 g to set 3', () => {
      const onSet3 = restEnd(next(adjust(onSet2, 'loadG', 1), T0 + 95_000), T0 + 185_000)

      expect(shownValuesOf(onSet3).loadG).toBe(45_000)
    })

    it('Then an adjust during the rest should change nothing for set 2', () => {
      const resting = next(adjusted, T0)

      expect(shownValuesOf(restEnd(adjust(resting, 'loadG', 4), T0 + 90_000)).loadG).toBe(42_500)
    })
  })
})

describe('Given supino-reto with set 1 recorded at 42500 g and 8 reps, now on set 2', () => {
  const adjusted = adjust(
    adjust(createWorkoutFlow(sessionOf([SUPINO_40, PRANCHA])), 'loadG', 1),
    'reps',
    -2,
  )
  const onSet2 = restEnd(next(adjusted, T0), T0 + 90_000)
  const goToExercise = (state: WorkoutFlowState, exerciseIndex: number, nowMs: number) =>
    workoutFlowReducer(state, { type: 'goTo', exerciseIndex, nowMs })

  describe('When the athlete goes to prancha and back to supino by the sequence', () => {
    it('Then supino should show 42500 g and 8 reps again', () => {
      const onPrancha = goToExercise(onSet2, 1, T0 + 100_000)
      const back = goToExercise(onPrancha, 0, T0 + 110_000)

      expect(shownValuesOf(back)).toEqual({ loadG: 42_500, reps: 8, seconds: null })
    })
  })

  describe('When prancha is adjusted to 50 s and the athlete goes to supino and back', () => {
    it('Then prancha should show 45 s, the adjust being lost', () => {
      const onPrancha = adjust(goToExercise(onSet2, 1, T0 + 100_000), 'seconds', 1)
      const back = goToExercise(goToExercise(onPrancha, 0, T0 + 110_000), 1, T0 + 120_000)

      expect(shownValuesOf(back).seconds).toBe(45)
    })
  })
})

describe('Given supino-reto adjusted to 42500 g and 8 reps but not recorded', () => {
  describe('When the athlete skips it', () => {
    it('Then prancha should show its own filled values, not the ones of supino', () => {
      const adjusted = adjust(
        adjust(createWorkoutFlow(sessionOf([SUPINO_40, PRANCHA])), 'loadG', 1),
        'reps',
        -2,
      )
      const skipped = workoutFlowReducer(adjusted, { type: 'skip', nowMs: T0 })

      expect(shownValuesOf(skipped)).toEqual({ loadG: 0, reps: null, seconds: 45 })
    })
  })
})

describe('Given prancha adjusted to 50 s with next tapped at T0', () => {
  const adjusted = adjust(createWorkoutFlow(sessionOf([PRANCHA])), 'seconds', 1)
  const counting = next(adjusted, T0)
  const timing = timerReach(counting, T0 + 3_000)

  describe('When the execution runs', () => {
    it('Then should end at T0 + 53 s and read 50 at its start', () => {
      expect([deadlineOf(timing), timerReadingOf(timing, T0 + 3_000).value]).toEqual([
        T0 + 53_000,
        50,
      ])
    })

    it('Then should not record at T0 + 52 999 ms', () => {
      expect(timerReach(timing, T0 + 52_999).recorded).toHaveLength(0)
    })

    it('Then should record 50 s performed at T0 + 53 s when the time is reached', () => {
      const [recorded] = timerReach(timing, T0 + 53_000).recorded

      expect([recorded?.seconds, recorded?.performedAt]).toEqual([
        50,
        new Date(T0 + 53_000).toISOString(),
      ])
    })
  })
})

describe('Given prancha adjusted to 50 s and 2500 g, running its execution from T0 + 3 s', () => {
  const adjusted = adjust(adjust(createWorkoutFlow(sessionOf([PRANCHA])), 'seconds', 1), 'loadG', 1)
  const timing = timerReach(next(adjusted, T0), T0 + 3_000)

  describe('When next ends the execution early at T0 + 23 s', () => {
    const ended = next(timing, T0 + 23_000)

    it('Then should record 20 s and the 2500 g shown', () => {
      const [recorded] = ended.recorded

      expect([recorded?.seconds, recorded?.loadG]).toEqual([20, 2_500])
    })

    it('Then set 2 should start from the 50 s shown before the execution', () => {
      expect(shownValuesOf(restEnd(ended, T0 + 83_000)).seconds).toBe(50)
    })
  })

  describe('When cancel arrives in the count or in the execution', () => {
    it.each([
      ['count', next(adjusted, T0)],
      ['execution', timing],
    ])('Then the %s should go back to set 1 showing 50 s', (_name, state) => {
      const cancelled = cancel(state, T0 + 10_000)

      expect([cancelled.phase, cancelled.setNumber, shownValuesOf(cancelled).seconds]).toEqual([
        'set',
        1,
        50,
      ])
    })
  })
})

describe('Given a saved state on set 1 of supino-reto', () => {
  const adjusted = adjust(
    adjust(createWorkoutFlow(sessionOf([SUPINO_40, PRANCHA])), 'loadG', 1),
    'reps',
    -2,
  )

  describe('When it is restored with a draft of 42500 g and 8 reps', () => {
    it('Then should show the same values', () => {
      expect(shownValuesOf(restoreWorkoutFlow(adjusted, T0 + 60_000))).toEqual({
        loadG: 42_500,
        reps: 8,
        seconds: null,
      })
    })
  })

  describe('When it is restored from a workout saved before the adjust existed', () => {
    const { draft: _draft, carriedValues: _carried, ...old } = adjusted
    const restored = restoreWorkoutFlow(old as WorkoutFlowState, T0 + 60_000)

    it('Then should show the filled values', () => {
      expect(shownValuesOf(restored)).toEqual({ loadG: 40_000, reps: 10, seconds: null })
    })

    it('Then should take an adjust', () => {
      expect(shownValuesOf(adjust(restored, 'loadG', 1)).loadG).toBe(42_500)
    })
  })

  describe('When it is restored with a draft that is negative or not an integer', () => {
    it.each([
      [{ loadG: -2_500, reps: 8, seconds: null }],
      [{ loadG: 42_500, reps: 8.5, seconds: null }],
      [{ loadG: 42_500, reps: 0, seconds: null }],
    ])('Then %o should be dropped for the filled values', (draft) => {
      const restored = restoreWorkoutFlow({ ...adjusted, draft }, T0 + 60_000)

      expect(shownValuesOf(restored)).toEqual({ loadG: 40_000, reps: 10, seconds: null })
    })
  })
})

describe('Given the 3rd and last set of supino-reto adjusted to 42500 g and 8 reps and recorded', () => {
  const onSet3 = restEnd(
    next(
      restEnd(next(createWorkoutFlow(sessionOf([SUPINO_40, PRANCHA])), T0), T0 + 90_000),
      T0 + 95_000,
    ),
    T0 + 185_000,
  )
  const recordedLast = next(adjust(adjust(onSet3, 'loadG', 1), 'reps', -2), T0 + 190_000)

  describe('When the rest ends and prancha comes up', () => {
    it('Then prancha should show its own filled values, not the ones of supino', () => {
      const onPrancha = restEnd(recordedLast, T0 + 280_000)

      expect(shownValuesOf(onPrancha)).toEqual({ loadG: 0, reps: null, seconds: 45 })
    })
  })
})

// Supino at 45 kg, 3 x 10 resting 90 s, and a prancha of 1 x 45 s: the fixture of US-F04-02.
const SUPINO_45 = {
  ...SUPINO_RETO,
  loadG: 45_000,
  plannedLoadG: 45_000,
  loadSource: 'program' as const,
}
const PRANCHA_ONE_SET = { ...PRANCHA, sets: 1 }

function openCorrection(state: WorkoutFlowState): WorkoutFlowState {
  return workoutFlowReducer(state, { type: 'openSheet', sheet: 'correction' })
}

// Prancha of one set recorded by the clock at 45 s: the workout is finished.
function finishedOnPrancha(): WorkoutFlowState {
  const counting = next(createWorkoutFlow(sessionOf([PRANCHA_ONE_SET])), T0)
  const timing = timerReach(counting, T0 + 3_000)
  return timerReach(timing, T0 + 3_000 + 45_000)
}

function restAfterSupinoSet1(): WorkoutFlowState {
  return next(createWorkoutFlow(sessionOf([SUPINO_45, PRANCHA])), T0)
}

describe('Given the flow in different phases', () => {
  describe.each([
    { name: 'the rest after set 1 of supino', state: restAfterSupinoSet1(), opens: true },
    { name: 'the finished workout', state: finishedOnPrancha(), opens: true },
    {
      name: 'set 2 of supino',
      state: restEnd(restAfterSupinoSet1(), T0 + 90_000),
      opens: false,
    },
    {
      name: 'the count of prancha',
      state: next(createWorkoutFlow(sessionOf([PRANCHA_ONE_SET])), T0),
      opens: false,
    },
    {
      name: 'the execution of prancha',
      state: timerReach(next(createWorkoutFlow(sessionOf([PRANCHA_ONE_SET])), T0), T0 + 3_000),
      opens: false,
    },
    { name: 'a workout with no set recorded', state: createWorkoutFlow(sessionOf()), opens: false },
  ])('When openSheet correction arrives in $name', ({ state, opens }) => {
    it(`Then should ${opens ? 'open the correction sheet' : 'return the same state'}`, () => {
      const after = openCorrection(state)

      expect(opens ? after.sheet : after).toEqual(opens ? 'correction' : state)
    })
  })
})

describe('Given the rest after set 1 of supino recorded at 45000 g and 10 reps', () => {
  describe('When lastSetOf reads the state', () => {
    it('Then should give the set, the exercise name and the total of sets', () => {
      const last = lastSetOf(restAfterSupinoSet1())

      expect(
        last && {
          loadG: last.set.loadG,
          reps: last.set.reps,
          setNumber: last.set.setNumber,
          exerciseName: last.exerciseName,
          setsTotal: last.setsTotal,
        },
      ).toEqual({ loadG: 45000, reps: 10, setNumber: 1, exerciseName: 'Supino reto', setsTotal: 3 })
    })
  })

  describe('When lastSetOf reads a workout with no set', () => {
    it('Then should give null', () => {
      expect(lastSetOf(createWorkoutFlow(sessionOf()))).toBeNull()
    })
  })
})

function correct(
  state: WorkoutFlowState,
  values: { loadG: number; reps: number | null; seconds: number | null },
  nowMs = T0 + 5_000,
): WorkoutFlowState {
  return workoutFlowReducer(state, { type: 'correctLastSet', values, nowMs })
}

describe('Given the rest after set 1 of supino with the correction sheet open', () => {
  describe('When correctLastSet arrives with 42500 g and 10 reps', () => {
    it('Then should change the load of the last set, keep its identity, close the sheet and mark the step as correct', () => {
      const open = openCorrection(restAfterSupinoSet1())
      const before = open.recorded[0] as RecordWorkoutSetBody

      const state = correct(open, { loadG: 42500, reps: 10, seconds: null })

      expect({
        last: state.recorded.at(-1),
        sheet: state.sheet,
        lastStep: state.lastStep,
        phase: state.phase,
        lastStepAtMs: state.lastStepAtMs,
      }).toEqual({
        last: { ...before, loadG: 42500 },
        sheet: 'none',
        lastStep: 'correct',
        phase: 'rest',
        lastStepAtMs: open.lastStepAtMs,
      })
    })
  })

  describe('When correctLastSet arrives twice, the second with 40000 g', () => {
    it('Then the second should return the same state, since the sheet is already closed', () => {
      const open = openCorrection(restAfterSupinoSet1())
      const once = correct(open, { loadG: 42500, reps: 10, seconds: null })

      expect(correct(once, { loadG: 40000, reps: 10, seconds: null })).toBe(once)
    })
  })

  describe('When correctLastSet arrives with the recorded values', () => {
    it('Then should close the sheet and keep the same recorded list', () => {
      const open = openCorrection(restAfterSupinoSet1())

      const state = correct(open, { loadG: 45000, reps: 10, seconds: null })

      expect({ sheet: state.sheet, sameRecorded: state.recorded === open.recorded }).toEqual({
        sheet: 'none',
        sameRecorded: true,
      })
    })
  })
})

const SUPINO_VALUES = { loadG: 42500, reps: 10, seconds: null }

describe('Given the correction sheet open in the rest, to be saved with values to check', () => {
  describe.each([
    { case: 'a negative load', values: { loadG: -2500, reps: 10, seconds: null } },
    { case: 'zero reps', values: { loadG: 45000, reps: 0, seconds: null } },
    { case: 'seconds on a reps exercise', values: { loadG: 45000, reps: null, seconds: 40 } },
    { case: 'reps and seconds together', values: { loadG: 45000, reps: 10, seconds: 40 } },
  ])('When correctLastSet arrives with $case', ({ values }) => {
    it('Then should return the same state', () => {
      const open = openCorrection(restAfterSupinoSet1())

      expect(correct(open, values)).toBe(open)
    })
  })

  describe('When correctLastSet arrives with 42500 g and 8 reps and the rest ends', () => {
    it('Then set 2 should show 42500 g and 8 reps', () => {
      const open = openCorrection(restAfterSupinoSet1())

      const corrected = correct(open, { loadG: 42500, reps: 8, seconds: null })
      const set2 = restEnd(corrected, T0 + 90_000)

      expect(shownValuesOf(set2)).toEqual({ loadG: 42500, reps: 8, seconds: null })
    })
  })
})

function restAfterPranchaByClock(): WorkoutFlowState {
  const counting = next(createWorkoutFlow(sessionOf([PRANCHA])), T0)
  const timing = timerReach(counting, T0 + 3_000)
  return timerReach(timing, T0 + 3_000 + 45_000)
}

function restAfterPranchaEndedAt20Seconds(): WorkoutFlowState {
  const counting = next(createWorkoutFlow(sessionOf([PRANCHA])), T0)
  const timing = timerReach(counting, T0 + 3_000)
  return next(timing, T0 + 3_000 + 20_000)
}

describe('Given prancha of 3 sets recorded by the clock at 45 s, with the correction sheet open', () => {
  describe('When correctLastSet arrives with 40 s and the rest ends', () => {
    it('Then set 2 should start at 40 s', () => {
      const open = openCorrection(restAfterPranchaByClock())

      const corrected = correct(open, { loadG: 0, reps: null, seconds: 40 })
      const set2 = restEnd(corrected, T0 + 3_000 + 45_000 + 60_000)

      expect(shownValuesOf(set2).seconds).toBe(40)
    })
  })
})

describe('Given prancha of 3 sets ended early at 20 s, with the correction sheet open', () => {
  describe('When correctLastSet arrives with 25 s and the rest ends', () => {
    it('Then the recorded set should have 25 s and set 2 should still show 45 s', () => {
      const open = openCorrection(restAfterPranchaEndedAt20Seconds())

      const corrected = correct(open, { loadG: 0, reps: null, seconds: 25 })
      const set2 = restEnd(corrected, T0 + 3_000 + 20_000 + 60_000)

      expect({
        recordedSeconds: corrected.recorded.at(-1)?.seconds,
        shown: shownValuesOf(set2).seconds,
      }).toEqual({
        recordedSeconds: 25,
        shown: 45,
      })
    })
  })
})

describe('Given the rest after set 1 of supino with the correction sheet open and the rest over', () => {
  describe('When restEnd arrives after the end of the rest', () => {
    it('Then should stay in the rest', () => {
      const open = openCorrection(restAfterSupinoSet1())

      expect(restEnd(open, T0 + 95_000).phase).toBe('rest')
    })
  })

  describe('When correctLastSet arrives at T0 + 95 000 with 42500 g and 8 reps', () => {
    it('Then should close the sheet and pass to set 2 with the corrected values, the guard starting at that instant', () => {
      const open = openCorrection(restAfterSupinoSet1())

      const state = correct(open, { loadG: 42500, reps: 8, seconds: null }, T0 + 95_000)

      expect({
        phase: state.phase,
        setNumber: state.setNumber,
        shown: shownValuesOf(state),
        lastStepAtMs: state.lastStepAtMs,
        sheet: state.sheet,
      }).toEqual({
        phase: 'set',
        setNumber: 2,
        shown: { loadG: 42500, reps: 8, seconds: null },
        lastStepAtMs: T0 + 95_000,
        sheet: 'none',
      })
    })
  })

  describe('When next arrives 100 ms after that passage', () => {
    it('Then should do nothing, since the guard still holds', () => {
      const open = openCorrection(restAfterSupinoSet1())
      const passed = correct(open, SUPINO_VALUES, T0 + 95_000)

      expect(next(passed, T0 + 95_100)).toBe(passed)
    })
  })
})

describe('Given the finished workout on the last set of prancha at 45 s, with the correction sheet open', () => {
  describe('When correctLastSet arrives with 40 s', () => {
    it('Then should change the seconds of the last set and keep the phase finished and the finish', () => {
      const open = openCorrection(finishedOnPrancha())

      const state = correct(open, { loadG: 0, reps: null, seconds: 40 })

      expect({
        seconds: state.recorded.at(-1)?.seconds,
        phase: state.phase,
        finish: state.finish,
      }).toEqual({ seconds: 40, phase: 'finished', finish: open.finish })
    })
  })
})

describe('Given a set corrected after the rest of supino, the rest of prancha and a pass to set 2', () => {
  describe.each([
    {
      case: 'a correction in the rest',
      state: () => correct(openCorrection(restAfterSupinoSet1()), SUPINO_VALUES),
      text: 'Série corrigida: 42,5 quilos, 10 repetições',
    },
    {
      case: 'a correction of prancha',
      state: () =>
        correct(openCorrection(restAfterPranchaByClock()), { loadG: 0, reps: null, seconds: 40 }),
      text: 'Série corrigida: 0 quilos, 40 segundos',
    },
    {
      case: 'a correction that passed to set 2',
      state: () => correct(openCorrection(restAfterSupinoSet1()), SUPINO_VALUES, T0 + 95_000),
      text: 'Série corrigida: 42,5 quilos, 10 repetições. Série 2 de 3',
    },
  ])('When announcementOf reads $case', ({ state, text }) => {
    it(`Then should say "${text}"`, () => {
      expect(announcementOf(state())).toBe(text)
    })
  })
})

describe('Given a saved state with the correction sheet open and the last set corrected', () => {
  describe('When restoreWorkoutFlow brings it back', () => {
    it('Then should close the sheet and keep the corrected values', () => {
      const corrected = correct(openCorrection(restAfterSupinoSet1()), SUPINO_VALUES)
      const saved = { ...corrected, sheet: 'correction' as const }

      const restored = restoreWorkoutFlow(saved, T0 + 10_000)

      expect({ sheet: restored.sheet, loadG: restored.recorded.at(-1)?.loadG }).toEqual({
        sheet: 'none',
        loadG: 42500,
      })
    })
  })
})
