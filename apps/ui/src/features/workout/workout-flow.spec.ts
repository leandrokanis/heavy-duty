import { describe, expect, it } from 'vitest'
import { PRANCHA, SUPINO_RETO, TRICEPS_POLIA, todayDay } from './test-today'
import {
  announcementOf,
  createWorkoutFlow,
  upcomingExercise,
  type WorkoutFlowState,
  type WorkoutSession,
  workoutFlowReducer,
} from './workout-flow'

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

      expect(state.recorded.map(({ body }) => body.setNumber)).toEqual([2])
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
      expect(next(onSet2, T0 + 800).recorded.map(({ body }) => body.setNumber)).toEqual([1, 2])
    })
  })
})

const NO_REST_SUPINO = { ...SUPINO_RETO, restSeconds: 0 }

describe('Given set 1 of an exercise with 3 sets and restSeconds 0', () => {
  describe('When next arrives', () => {
    it('Then set 1 should be recorded and set 2 should be ready with no rest', () => {
      const state = next(createWorkoutFlow(sessionOf([NO_REST_SUPINO, TRICEPS_POLIA])), T0)

      expect({
        recorded: state.recorded.map(({ body }) => body.setNumber),
        phase: state.phase,
        setNumber: state.setNumber,
        restEndsAtMs: state.restEndsAtMs,
      }).toEqual({ recorded: [1], phase: 'set', setNumber: 2, restEndsAtMs: null })
    })
  })
})

// Sets 1 and 2 of triceps-polia already recorded and set 3, the last of the day, on screen.
function tricepsSet3(t: number): WorkoutFlowState {
  const onTriceps = { ...createWorkoutFlow(sessionOf(LETTER_A)), exerciseIndex: 1 }
  return restEnd(next(restEnd(next(onTriceps, t - 122_000), t - 62_000), t - 61_000), t - 1000)
}

describe('Given set 3 of triceps-polia, the last set of the day', () => {
  const onLastSet = tricepsSet3(T0)

  describe('When next arrives', () => {
    it('Then set 3 should be recorded with 12 reps and 20000 g, and the workout should be finished with no rest', () => {
      const state = next(onLastSet, T0)
      const last = state.recorded.at(-1)?.body

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
        recorded: state.recorded.map(({ body }) => body.setNumber),
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
