import { createClientId } from './client-id'
import type { TodayDay, TodayExercise } from './today.types'
import { DOUBLE_TAP_GUARD_MS } from './workout.config'
import type { RecordWorkoutSetBody, SendResult } from './workout-set.types'

const MS_PER_SECOND = 1000

export type WorkoutSession = {
  workoutId: string
  startedAt: string
  programId: string
  day: TodayDay
}

export type SendStatus = 'sending' | 'sent' | 'failed'

export type RecordedSet = { body: RecordWorkoutSetBody; status: SendStatus }

export type WorkoutFlowState = {
  session: WorkoutSession
  phase: 'set' | 'rest'
  exerciseIndex: number
  setNumber: number
  restEndsAtMs: number | null
  lastRecordedAtMs: number | null
  recorded: RecordedSet[]
}

export type WorkoutFlowAction =
  | { type: 'next'; nowMs: number }
  | { type: 'sendResult'; setId: string; result: SendResult }
  | { type: 'resend' }

export function createWorkoutFlow(session: WorkoutSession): WorkoutFlowState {
  return {
    session,
    phase: 'set',
    exerciseIndex: 0,
    setNumber: 1,
    restEndsAtMs: null,
    lastRecordedAtMs: null,
    recorded: [],
  }
}

export function currentExercise(state: WorkoutFlowState): TodayExercise {
  return state.session.day.exercises[state.exerciseIndex] as TodayExercise
}

export function workoutFlowReducer(
  state: WorkoutFlowState,
  action: WorkoutFlowAction,
): WorkoutFlowState {
  switch (action.type) {
    case 'next':
      return isNextIgnored(state, action.nowMs) ? state : recordSet(state, action.nowMs)
    case 'sendResult':
      return withStatus(state, (set) => set.body.id === action.setId, action.result)
    case 'resend':
      return withStatus(state, (set) => set.status === 'failed', 'sending')
  }
}

// Skipping the rest comes with US-F05-01; until then "Próximo" does nothing while resting.
function isNextIgnored(state: WorkoutFlowState, nowMs: number): boolean {
  if (state.phase === 'rest') return true
  return state.lastRecordedAtMs !== null && nowMs - state.lastRecordedAtMs < DOUBLE_TAP_GUARD_MS
}

function recordSet(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  const planned = currentExercise(state)
  const { session } = state
  const measure =
    planned.exercise.kind === 'time'
      ? { seconds: planned.targetSeconds as number }
      : { reps: planned.targetReps as number }
  const body: RecordWorkoutSetBody = {
    id: createClientId(nowMs),
    workout: {
      programId: session.programId,
      letter: session.day.letter,
      startedAt: session.startedAt,
    },
    plannedExerciseId: planned.plannedExerciseId,
    exerciseId: planned.exercise.id,
    setNumber: state.setNumber,
    loadG: planned.loadG,
    ...measure,
    performedAt: new Date(nowMs).toISOString(),
  }
  return {
    ...state,
    phase: 'rest',
    restEndsAtMs: nowMs + planned.restSeconds * MS_PER_SECOND,
    lastRecordedAtMs: nowMs,
    recorded: [...state.recorded, { body, status: 'sending' }],
  }
}

function withStatus(
  state: WorkoutFlowState,
  matches: (set: RecordedSet) => boolean,
  status: SendStatus,
): WorkoutFlowState {
  return {
    ...state,
    recorded: state.recorded.map((set) => (matches(set) ? { ...set, status } : set)),
  }
}
