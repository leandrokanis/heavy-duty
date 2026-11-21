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
  phase: 'set' | 'rest' | 'finished'
  exerciseIndex: number
  setNumber: number
  restEndsAtMs: number | null
  lastStepAtMs: number | null
  lastStep: 'record' | 'advance' | null
  recorded: RecordedSet[]
}

export type WorkoutFlowAction =
  | { type: 'next'; nowMs: number }
  | { type: 'restEnd'; nowMs: number }
  | { type: 'sendResult'; setId: string; result: SendResult }
  | { type: 'resend' }

export function createWorkoutFlow(session: WorkoutSession): WorkoutFlowState {
  return {
    session,
    phase: 'set',
    exerciseIndex: 0,
    setNumber: 1,
    restEndsAtMs: null,
    lastStepAtMs: null,
    lastStep: null,
    recorded: [],
  }
}

export type Position = { exerciseIndex: number; setNumber: number }

// The set after the given one: the next set, set 1 of the next exercise, or null at the end of the day.
export function nextPositionOf(day: TodayDay, position: Position): Position | null {
  const planned = day.exercises[position.exerciseIndex]
  if (planned && position.setNumber < planned.sets) {
    return { exerciseIndex: position.exerciseIndex, setNumber: position.setNumber + 1 }
  }
  if (position.exerciseIndex + 1 < day.exercises.length) {
    return { exerciseIndex: position.exerciseIndex + 1, setNumber: 1 }
  }
  return null
}

export function currentExercise(state: WorkoutFlowState): TodayExercise {
  return state.session.day.exercises[state.exerciseIndex] as TodayExercise
}

// The exercise after the rest, only when it differs from the one on screen.
export function upcomingExercise(state: WorkoutFlowState): TodayExercise | null {
  if (state.phase !== 'rest') return null
  const position = nextPositionOf(state.session.day, state)
  if (position === null || position.exerciseIndex === state.exerciseIndex) return null
  return state.session.day.exercises[position.exerciseIndex] as TodayExercise
}

// Text of the polite live region: the set just recorded, then the set now on screen, if any.
export function announcementOf(state: WorkoutFlowState): string {
  if (state.lastStep === 'advance') return positionText(state)
  const last = state.recorded.at(-1)?.body
  if (state.lastStep !== 'record' || last === undefined) return ''
  const planned = state.session.day.exercises.find(
    ({ plannedExerciseId }) => plannedExerciseId === last.plannedExerciseId,
  ) as TodayExercise
  const recordedText = `Série ${last.setNumber} de ${planned.sets} registrada`
  if (state.phase === 'finished') return `${recordedText}. Treino concluído`
  if (state.phase === 'set') return `${recordedText}. ${positionText(state)}`
  return recordedText
}

function positionText(state: WorkoutFlowState): string {
  const planned = currentExercise(state)
  if (state.setNumber === 1) return `${planned.exercise.name}, série 1 de ${planned.sets}`
  return `Série ${state.setNumber} de ${planned.sets}`
}

export function workoutFlowReducer(
  state: WorkoutFlowState,
  action: WorkoutFlowAction,
): WorkoutFlowState {
  switch (action.type) {
    case 'next':
      if (state.phase === 'finished' || isGuarded(state, action.nowMs)) return state
      return state.phase === 'rest' ? advance(state, action.nowMs) : recordSet(state, action.nowMs)
    case 'restEnd':
      return hasRestEnded(state, action.nowMs) ? advance(state, action.nowMs) : state
    case 'sendResult':
      return withStatus(state, (set) => set.body.id === action.setId, action.result)
    case 'resend':
      return withStatus(state, (set) => set.status === 'failed', 'sending')
  }
}

function isGuarded(state: WorkoutFlowState, nowMs: number): boolean {
  return state.lastStepAtMs !== null && nowMs - state.lastStepAtMs < DOUBLE_TAP_GUARD_MS
}

function hasRestEnded(state: WorkoutFlowState, nowMs: number): boolean {
  return state.phase === 'rest' && state.restEndsAtMs !== null && nowMs >= state.restEndsAtMs
}

function advance(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  const position = nextPositionOf(state.session.day, state) as Position
  return {
    ...state,
    ...position,
    phase: 'set',
    restEndsAtMs: null,
    lastStepAtMs: nowMs,
    lastStep: 'advance',
  }
}

function recordSet(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  const planned = currentExercise(state)
  const withSet: WorkoutFlowState = {
    ...state,
    lastStepAtMs: nowMs,
    lastStep: 'record',
    recorded: [...state.recorded, { body: setBodyOf(state, planned, nowMs), status: 'sending' }],
  }
  // The last set of the day wins over a 0 s rest: there is no position to advance to.
  if (nextPositionOf(state.session.day, state) === null) {
    return { ...withSet, phase: 'finished', restEndsAtMs: null }
  }
  if (planned.restSeconds === 0) return { ...advance(withSet, nowMs), lastStep: 'record' }
  return { ...withSet, phase: 'rest', restEndsAtMs: nowMs + planned.restSeconds * MS_PER_SECOND }
}

function setBodyOf(
  state: WorkoutFlowState,
  planned: TodayExercise,
  nowMs: number,
): RecordWorkoutSetBody {
  const { session } = state
  const measure =
    planned.exercise.kind === 'time'
      ? { seconds: planned.targetSeconds as number }
      : { reps: planned.targetReps as number }
  return {
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
