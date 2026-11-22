import { createClientId } from './client-id'
import { type AdjustField, adjustValue, MINIMUMS } from './drag-adjust'
import type { TodayDay, TodayExercise } from './today.types'
import { COUNTDOWN_MS, DOUBLE_TAP_GUARD_MS } from './workout.config'
import type { FinishWorkoutBody } from './workout-finish.types'
import type { RecordWorkoutSetBody } from './workout-set.types'

const MS_PER_SECOND = 1000

export type WorkoutSession = {
  workoutId: string
  startedAt: string
  programId: string
  day: TodayDay
}

// The numbers on the set screen; reps or seconds is null for the other kind of exercise.
export type SetValues = { loadG: number; reps: number | null; seconds: number | null }

export type SheetName = 'none' | 'sequence' | 'confirmEnd'

// An exercise the athlete skipped and did not do yet; the instant is the last skip (ADR-023).
export type SkippedMark = { plannedExerciseId: string; skippedAt: string }

export type WorkoutFlowState = {
  session: WorkoutSession
  phase: 'set' | 'countdown' | 'timing' | 'rest' | 'finished' | 'ended'
  exerciseIndex: number
  setNumber: number
  restEndsAtMs: number | null
  // The instant the execution of a timed exercise starts (the count ends); null outside the timer.
  executionStartsAtMs: number | null
  lastStepAtMs: number | null
  lastStep:
    | 'record'
    | 'advance'
    | 'goTo'
    | 'skip'
    | 'countdown'
    | 'begin'
    | 'timerEnd'
    | 'cancel'
    | null
  // The exercise picked in the sequence during the rest; null when the order decides.
  nextExerciseIndex: number | null
  // The exercises skipped and not done yet, in the order of the last skip.
  skipped: SkippedMark[]
  // The sheet over the screen; while one is open the rest counts but the passage waits (FR-017).
  sheet: SheetName
  // How the workout ended; the screen queues it after the sets. Null while it runs, and after an
  // early end with no set recorded, which sends nothing (FR-019).
  finish: FinishWorkoutBody | null
  // The sets as the API takes them; sending is the queue's job, so no status lives here.
  recorded: RecordWorkoutSetBody[]
  // The values the athlete adjusted on the set on screen; null while nothing is adjusted.
  draft: SetValues | null
  // By planned exercise, the values the next set of it starts from, after its last record.
  carriedValues: Record<string, SetValues>
}

export type WorkoutFlowAction =
  | { type: 'next'; nowMs: number }
  | { type: 'restEnd'; nowMs: number }
  | { type: 'timerReach'; nowMs: number }
  | { type: 'cancel'; nowMs: number }
  | { type: 'goTo'; exerciseIndex: number; nowMs: number }
  | { type: 'openSheet'; sheet: Exclude<SheetName, 'none'> }
  | { type: 'closeSheet'; nowMs: number }
  | { type: 'skip'; nowMs: number }
  | { type: 'end'; nowMs: number }
  | { type: 'adjust'; field: AdjustField; steps: number }

export function createWorkoutFlow(session: WorkoutSession): WorkoutFlowState {
  return {
    session,
    phase: 'set',
    exerciseIndex: 0,
    setNumber: 1,
    restEndsAtMs: null,
    executionStartsAtMs: null,
    lastStepAtMs: null,
    lastStep: null,
    nextExerciseIndex: null,
    skipped: [],
    sheet: 'none',
    finish: null,
    recorded: [],
    draft: null,
    carriedValues: {},
  }
}

export type Position = { exerciseIndex: number; setNumber: number }

function setsDoneOf(state: WorkoutFlowState, planned: TodayExercise): number {
  return state.recorded.filter((body) => body.plannedExerciseId === planned.plannedExerciseId)
    .length
}

function isSkipped(state: WorkoutFlowState, planned: TodayExercise): boolean {
  return state.skipped.some((mark) => mark.plannedExerciseId === planned.plannedExerciseId)
}

// The set after the last recorded one (FR-008): the exercise picked in the sequence, else the next
// set of the exercise on screen, else the first exercise of the letter, in program order, that
// still has sets to do, else null. Skipped exercises wait out of the order (FR-007).
export function nextPositionOf(state: WorkoutFlowState): Position | null {
  const { exercises } = state.session.day
  const picked = typeof state.nextExerciseIndex === 'number' ? state.nextExerciseIndex : null
  const pickedExercise = picked === null ? undefined : exercises[picked]
  if (picked !== null && pickedExercise) {
    return { exerciseIndex: picked, setNumber: setsDoneOf(state, pickedExercise) + 1 }
  }
  const current = exercises[state.exerciseIndex]
  if (current && setsDoneOf(state, current) < current.sets && !isSkipped(state, current)) {
    return { exerciseIndex: state.exerciseIndex, setNumber: setsDoneOf(state, current) + 1 }
  }
  const exerciseIndex = exercises.findIndex(
    (planned) => setsDoneOf(state, planned) < planned.sets && !isSkipped(state, planned),
  )
  if (exerciseIndex === -1) return null
  return {
    exerciseIndex,
    setNumber: setsDoneOf(state, exercises[exerciseIndex] as TodayExercise) + 1,
  }
}

// A set as the athlete recorded it: the sent values, not the planned ones (FR-002).
export type RecordedSetView = Pick<RecordWorkoutSetBody, 'setNumber' | 'loadG' | 'reps' | 'seconds'>

export type SequenceItem = {
  exerciseIndex: number
  name: string
  status: 'done' | 'current' | 'skipped' | 'todo'
  setsDone: number
  setsTotal: number
  // The recorded sets, only while the exercise is done (FR-004); empty otherwise.
  recordedSets: RecordedSetView[]
}

// The exercises of the letter in program order with their state (FR-002, FR-003). The current one
// is the exercise on screen or, during the rest, the one that shows when the rest ends.
export function sequenceOf(state: WorkoutFlowState): SequenceItem[] {
  const currentIndex = currentIndexOf(state)
  return state.session.day.exercises.map((planned, exerciseIndex) => {
    const setsDone = setsDoneOf(state, planned)
    const done = setsDone >= planned.sets
    const status = statusOf(state, planned, exerciseIndex === currentIndex, done)
    return {
      exerciseIndex,
      name: planned.exercise.name,
      status,
      setsDone,
      setsTotal: planned.sets,
      recordedSets: status === 'done' ? recordedSetsOf(state, planned) : [],
    }
  })
}

function recordedSetsOf(state: WorkoutFlowState, planned: TodayExercise): RecordedSetView[] {
  return state.recorded
    .filter((body) => body.plannedExerciseId === planned.plannedExerciseId)
    .sort((a, b) => a.setNumber - b.setNumber)
    .map(({ setNumber, loadG, reps, seconds }) => ({
      setNumber,
      loadG,
      ...(reps === undefined ? {} : { reps }),
      ...(seconds === undefined ? {} : { seconds }),
    }))
}

// The exercise on screen wins over the skipped mark (FR-011).
function statusOf(
  state: WorkoutFlowState,
  planned: TodayExercise,
  isCurrent: boolean,
  done: boolean,
): SequenceItem['status'] {
  if (isCurrent) return 'current'
  if (done) return 'done'
  return isSkipped(state, planned) ? 'skipped' : 'todo'
}

// Skipping needs another exercise with sets to do that is not skipped; otherwise the athlete
// finishes the exercise or ends the workout (FR-002).
export function canSkipOf(state: WorkoutFlowState): boolean {
  if (state.phase !== 'set' && state.phase !== 'rest') return false
  const target = state.phase === 'set' ? state.exerciseIndex : nextPositionOf(state)?.exerciseIndex
  return state.session.day.exercises.some(
    (planned, exerciseIndex) =>
      exerciseIndex !== target &&
      setsDoneOf(state, planned) < planned.sets &&
      !isSkipped(state, planned),
  )
}

function currentIndexOf(state: WorkoutFlowState): number | null {
  if (state.phase === 'finished') return null
  if (state.phase === 'rest') return nextPositionOf(state)?.exerciseIndex ?? null
  return state.exerciseIndex
}

// Exercises done plus the one on screen, up to the total (decision 51). A finished workout counts
// only the exercises done, so the ones left out show (FR-012).
export function exerciseProgressOf(state: WorkoutFlowState): number {
  const total = state.session.day.exercises.length
  const done = sequenceOf(state).filter(({ status }) => status === 'done').length
  if (state.phase === 'finished') return done
  return Math.min(done + 1, total)
}

export type LeftOutItem = {
  plannedExerciseId: string
  name: string
  setsDone: number
  setsTotal: number
  skippedAt: string
}

// The exercises skipped and not done, in program order (FR-013). The screen queues them with the
// end of the workout.
export function leftOutOf(state: WorkoutFlowState): LeftOutItem[] {
  return state.session.day.exercises.flatMap((planned) => {
    const mark = state.skipped.find(
      ({ plannedExerciseId }) => plannedExerciseId === planned.plannedExerciseId,
    )
    return mark
      ? [
          {
            plannedExerciseId: planned.plannedExerciseId,
            name: planned.exercise.name,
            setsDone: setsDoneOf(state, planned),
            setsTotal: planned.sets,
            skippedAt: mark.skippedAt,
          },
        ]
      : []
  })
}

function filledValuesOf(planned: TodayExercise): SetValues {
  return { loadG: planned.loadG, reps: planned.targetReps, seconds: planned.targetSeconds }
}

// The values on the set screen: the adjusted ones, else those the last record of the exercise
// carries, else the filled ones (decision 29).
export function shownValuesOf(state: WorkoutFlowState): SetValues {
  const planned = currentExercise(state)
  return state.draft ?? state.carriedValues[planned.plannedExerciseId] ?? filledValuesOf(planned)
}

export function currentExercise(state: WorkoutFlowState): TodayExercise {
  return state.session.day.exercises[state.exerciseIndex] as TodayExercise
}

// The exercise after the rest, only when it differs from the one on screen.
export function upcomingExercise(state: WorkoutFlowState): TodayExercise | null {
  if (state.phase !== 'rest') return null
  const position = nextPositionOf(state)
  if (position === null || position.exerciseIndex === state.exerciseIndex) return null
  return state.session.day.exercises[position.exerciseIndex] as TodayExercise
}

// What the ring or the count shows at an instant, with the step and instant that cue the sound.
// The value is the count number or the seconds left, 0 outside the timer.
export type TimerReading = {
  stage: 'off' | 'countdown' | 'execution'
  value: number
  lastStep: WorkoutFlowState['lastStep']
  atMs: number
}

export function timerReadingOf(state: WorkoutFlowState, nowMs: number): TimerReading {
  const { lastStep } = state
  const deadlineMs = deadlineOf(state)
  if (state.phase === 'countdown' && deadlineMs !== null) {
    const number = Math.ceil((deadlineMs - nowMs) / MS_PER_SECOND)
    return { stage: 'countdown', value: Math.min(3, Math.max(1, number)), lastStep, atMs: nowMs }
  }
  if (state.phase === 'timing' && deadlineMs !== null) {
    const shownSeconds = shownValuesOf(state).seconds as number
    const secondsLeft = Math.ceil((deadlineMs - nowMs) / MS_PER_SECOND)
    const value = Math.min(shownSeconds, Math.max(0, secondsLeft))
    return { stage: 'execution', value, lastStep, atMs: nowMs }
  }
  return { stage: 'off', value: 0, lastStep, atMs: nowMs }
}

// The instant the phase on screen ends by the clock: the count, the execution or the rest.
export function deadlineOf(state: WorkoutFlowState): number | null {
  if (state.phase === 'countdown') return state.executionStartsAtMs
  if (state.phase === 'timing') {
    const shownSeconds = shownValuesOf(state).seconds as number
    return (state.executionStartsAtMs as number) + shownSeconds * MS_PER_SECOND
  }
  return state.phase === 'rest' ? state.restEndsAtMs : null
}

// Text of the polite live region: the set just recorded, then the set now on screen, if any.
export function announcementOf(state: WorkoutFlowState): string {
  if (state.lastStep === 'begin') return 'Começou'
  if (state.lastStep === 'cancel') return positionText(state)
  if (state.lastStep === 'skip' && state.phase === 'rest') return upcomingText(state)
  if (state.lastStep === 'advance' || state.lastStep === 'goTo' || state.lastStep === 'skip') {
    return positionText(state)
  }
  const last = state.recorded.at(-1)
  if ((state.lastStep !== 'record' && state.lastStep !== 'timerEnd') || last === undefined) {
    return ''
  }
  const planned = state.session.day.exercises.find(
    ({ plannedExerciseId }) => plannedExerciseId === last.plannedExerciseId,
  ) as TodayExercise
  const recordedText = `Série ${last.setNumber} de ${planned.sets} registrada`
  if (state.phase === 'finished') return `${recordedText}. Treino concluído${leftOutText(state)}`
  if (state.phase === 'set') return `${recordedText}. ${positionText(state)}`
  return recordedText
}

function leftOutText(state: WorkoutFlowState): string {
  const names = leftOutOf(state).map(({ name }) => name)
  if (names.length === 0) return ''
  return `. ${names.length === 1 ? 'Ficou' : 'Ficaram'} de fora: ${names.join(', ')}`
}

function upcomingText(state: WorkoutFlowState): string {
  const position = nextPositionOf(state) as Position
  return `A seguir: ${state.session.day.exercises[position.exerciseIndex]?.exercise.name}`
}

// The name comes with the set when the exercise is new on screen: the first set, a pick from the
// sequence, or a return to an exercise other than the last one recorded (FR-013).
function positionText(state: WorkoutFlowState): string {
  const planned = currentExercise(state)
  const last = state.recorded.at(-1)
  const isNewOnScreen =
    state.setNumber === 1 ||
    state.lastStep === 'goTo' ||
    state.lastStep === 'skip' ||
    state.lastStep === 'cancel' ||
    last?.plannedExerciseId !== planned.plannedExerciseId
  const numbers = `${state.setNumber} de ${planned.sets}`
  return isNewOnScreen ? `${planned.exercise.name}, série ${numbers}` : `Série ${numbers}`
}

function isValidValues(values: SetValues | null | undefined): values is SetValues {
  if (!values) return false
  const fields: AdjustField[] = ['loadG', 'reps', 'seconds']
  return fields.every((field) => {
    const value = values[field]
    return value === null || (Number.isSafeInteger(value) && value >= MINIMUMS[field])
  })
}

// Brings a saved state back: a rest that ended with the app closed is over, a timer waits for the
// screen to settle it, and no tap of the last session guards against the first tap of this one.
// Saved values that are not integers above the minimum are dropped, so the body stays valid.
export function restoreWorkoutFlow(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  const saved: WorkoutFlowState = {
    ...state,
    skipped: state.skipped ?? [],
    draft: isValidValues(state.draft) ? state.draft : null,
    carriedValues: Object.fromEntries(
      Object.entries(state.carriedValues ?? {}).filter(([, values]) => isValidValues(values)),
    ),
  }
  const settled = hasRestEnded(saved, nowMs) ? advance(saved, nowMs) : saved
  return {
    ...settled,
    nextExerciseIndex: settled.nextExerciseIndex ?? null,
    executionStartsAtMs: settled.executionStartsAtMs ?? null,
    sheet: 'none',
    finish: settled.finish ?? null,
    lastStepAtMs: null,
    lastStep: null,
  }
}

export function workoutFlowReducer(
  state: WorkoutFlowState,
  action: WorkoutFlowAction,
): WorkoutFlowState {
  switch (action.type) {
    case 'next':
      if (state.phase === 'finished' || state.sheet !== 'none' || isGuarded(state, action.nowMs)) {
        return state
      }
      if (state.phase === 'countdown') return state
      if (state.phase === 'rest') return advance(state, action.nowMs)
      if (state.phase === 'timing') return endEarly(state, action.nowMs)
      return isTimed(currentExercise(state))
        ? openCountdown(state, action.nowMs)
        : recordSet(state, {
            performedAtMs: action.nowMs,
            stepAtMs: action.nowMs,
            lastStep: 'record',
          })
    case 'restEnd':
      if (state.sheet !== 'none') return state
      return hasRestEnded(state, action.nowMs) ? advance(state, action.nowMs) : state
    case 'timerReach':
      return reachTimer(state, action.nowMs)
    case 'cancel':
      return cancelTimer(state, action.nowMs)
    case 'goTo':
      return goTo(state, action.exerciseIndex, action.nowMs)
    case 'openSheet':
      return isTimerOpen(state) ? state : { ...state, sheet: action.sheet }
    case 'closeSheet':
      return closeSheet(state, action.nowMs)
    case 'skip':
      return skipExercise(state, action.nowMs)
    case 'end':
      return isTimerOpen(state) ? state : endWorkout(state, action.nowMs)
    case 'adjust':
      return adjustShown(state, action.field, action.steps)
  }
}

// Only the set on screen, with no sheet over it, takes an adjust, and only the field its exercise has.
function adjustShown(state: WorkoutFlowState, field: AdjustField, steps: number): WorkoutFlowState {
  if (state.phase !== 'set' || state.sheet !== 'none') return state
  const shown = shownValuesOf(state)
  const value = shown[field]
  if (value === null) return state
  return { ...state, draft: { ...shown, [field]: adjustValue(field, value, steps) } }
}

// Only an exercise with sets to do, other than the one on screen, can be picked (FR-007).
function goTo(state: WorkoutFlowState, exerciseIndex: number, nowMs: number): WorkoutFlowState {
  const planned = state.session.day.exercises[exerciseIndex]
  const setsDone = planned ? setsDoneOf(state, planned) : 0
  if (!planned || setsDone >= planned.sets) return state
  if (state.phase === 'rest') return pickDuringRest(state, exerciseIndex)
  if (state.phase !== 'set' || exerciseIndex === state.exerciseIndex) return state
  return {
    ...state,
    exerciseIndex,
    setNumber: setsDone + 1,
    draft: null,
    lastStepAtMs: nowMs,
    lastStep: 'goTo',
  }
}

// The rest keeps counting and only the exercise that follows changes. Picking the one the order
// brings undoes an earlier pick.
function pickDuringRest(state: WorkoutFlowState, exerciseIndex: number): WorkoutFlowState {
  const byOrder = nextPositionOf({ ...state, nextExerciseIndex: null })
  return {
    ...state,
    nextExerciseIndex: byOrder?.exerciseIndex === exerciseIndex ? null : exerciseIndex,
  }
}

// A rest that ran out under the sheet passes to the next set now, and the guard starts here.
function closeSheet(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  const closed: WorkoutFlowState = { ...state, sheet: 'none' }
  return hasRestEnded(closed, nowMs) ? advance(closed, nowMs) : closed
}

// Skipping marks the exercise on screen, or the one the rest brings, and moves on to the next one
// by the order. Out of the rest the next set shows at once; in the rest the count goes on (FR-004).
function skipExercise(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  if (!canSkipOf(state)) return state
  if (state.phase === 'rest') {
    const target = nextPositionOf(state) as Position
    const marked = markSkipped(state, exerciseAt(state, target.exerciseIndex), nowMs)
    return { ...marked, nextExerciseIndex: null, lastStep: 'skip' }
  }
  const marked = markSkipped(state, currentExercise(state), nowMs)
  const position = nextPositionOf({ ...marked, nextExerciseIndex: null }) as Position
  return { ...marked, ...position, draft: null, lastStepAtMs: nowMs, lastStep: 'skip' }
}

function exerciseAt(state: WorkoutFlowState, exerciseIndex: number): TodayExercise {
  return state.session.day.exercises[exerciseIndex] as TodayExercise
}

// The new skip of the same exercise replaces the instant.
function markSkipped(
  state: WorkoutFlowState,
  planned: TodayExercise,
  nowMs: number,
): WorkoutFlowState {
  const others = state.skipped.filter(
    (mark) => mark.plannedExerciseId !== planned.plannedExerciseId,
  )
  const mark: SkippedMark = {
    plannedExerciseId: planned.plannedExerciseId,
    skippedAt: new Date(nowMs).toISOString(),
  }
  return { ...state, skipped: [...others, mark] }
}

// An early end stops the rest. A workout already finished on its last set keeps its reason.
function endWorkout(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  if (state.phase === 'finished' || state.phase === 'ended') return state
  const finish: FinishWorkoutBody | null =
    state.recorded.length === 0
      ? null
      : { finishedAt: new Date(nowMs).toISOString(), endReason: 'ended_early' }
  return {
    ...state,
    phase: 'ended',
    restEndsAtMs: null,
    sheet: 'none',
    lastStep: null,
    finish,
  }
}

// The count turns into the execution at its instant, and the execution ends by itself at its own.
// One call settles every passage the clock skipped; the guard starts at the tick (decision 32).
function reachTimer(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  const startsAtMs = state.executionStartsAtMs
  if (startsAtMs === null || nowMs < startsAtMs) return state
  if (state.phase !== 'countdown' && state.phase !== 'timing') return state
  const begun: WorkoutFlowState =
    state.phase === 'countdown'
      ? { ...state, phase: 'timing', lastStepAtMs: nowMs, lastStep: 'begin' }
      : state
  const endsAtMs = startsAtMs + (shownValuesOf(begun).seconds as number) * MS_PER_SECOND
  if (nowMs < endsAtMs) return begun
  return recordSet(begun, {
    performedAtMs: endsAtMs,
    stepAtMs: nowMs,
    lastStep: 'timerEnd',
  })
}

// The athlete ends the execution: the recorded time is the shown time minus the seconds the ring
// shows, at least 1 (decision 33).
function endEarly(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  const shownSeconds = shownValuesOf(state).seconds as number
  const endsAtMs = (state.executionStartsAtMs as number) + shownSeconds * MS_PER_SECOND
  const ringSeconds = Math.ceil((endsAtMs - nowMs) / MS_PER_SECOND)
  return recordSet(state, {
    performedAtMs: nowMs,
    stepAtMs: nowMs,
    lastStep: 'record',
    seconds: Math.max(1, shownSeconds - ringSeconds),
  })
}

// Back to the same set with nothing recorded; the guard starts here (decision 35).
function cancelTimer(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  if (state.phase !== 'countdown' && state.phase !== 'timing') return state
  return {
    ...state,
    phase: 'set',
    executionStartsAtMs: null,
    lastStepAtMs: nowMs,
    lastStep: 'cancel',
  }
}

function isTimerOpen(state: WorkoutFlowState): boolean {
  return state.phase === 'countdown' || state.phase === 'timing'
}

function isTimed(planned: TodayExercise): boolean {
  return planned.exercise.kind === 'time'
}

function openCountdown(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  return {
    ...state,
    phase: 'countdown',
    executionStartsAtMs: nowMs + COUNTDOWN_MS,
    lastStepAtMs: nowMs,
    lastStep: 'countdown',
  }
}

function isGuarded(state: WorkoutFlowState, nowMs: number): boolean {
  return state.lastStepAtMs !== null && nowMs - state.lastStepAtMs < DOUBLE_TAP_GUARD_MS
}

function hasRestEnded(state: WorkoutFlowState, nowMs: number): boolean {
  return state.phase === 'rest' && state.restEndsAtMs !== null && nowMs >= state.restEndsAtMs
}

function advance(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  const position = nextPositionOf(state) as Position
  return {
    ...state,
    ...position,
    phase: 'set',
    restEndsAtMs: null,
    nextExerciseIndex: null,
    draft: null,
    lastStepAtMs: nowMs,
    lastStep: 'advance',
  }
}

type RecordOptions = {
  // The instant stored with the set and where the rest starts.
  performedAtMs: number
  // The instant of the screen change the athlete sees, where the double-tap guard starts.
  stepAtMs: number
  lastStep: 'record' | 'timerEnd'
  // Set only by a timed exercise ended early; otherwise the target.
  seconds?: number
}

function recordSet(state: WorkoutFlowState, options: RecordOptions): WorkoutFlowState {
  const { performedAtMs, stepAtMs, lastStep } = options
  const planned = currentExercise(state)
  const withSet: WorkoutFlowState = {
    ...state,
    executionStartsAtMs: null,
    lastStepAtMs: stepAtMs,
    lastStep,
    skipped: state.skipped.filter((mark) => mark.plannedExerciseId !== planned.plannedExerciseId),
    recorded: [...state.recorded, setBodyOf(state, planned, performedAtMs, options.seconds)],
    draft: null,
    carriedValues: { ...state.carriedValues, [planned.plannedExerciseId]: shownValuesOf(state) },
  }
  // The last set of the day wins over a 0 s rest: there is no position to advance to.
  if (nextPositionOf(withSet) === null) {
    const last = withSet.recorded.at(-1) as RecordWorkoutSetBody
    const finish: FinishWorkoutBody = { finishedAt: last.performedAt, endReason: 'completed' }
    return { ...withSet, phase: 'finished', restEndsAtMs: null, finish }
  }
  if (planned.restSeconds === 0) return { ...advance(withSet, stepAtMs), lastStep }
  return {
    ...withSet,
    phase: 'rest',
    restEndsAtMs: performedAtMs + planned.restSeconds * MS_PER_SECOND,
  }
}

function setBodyOf(
  state: WorkoutFlowState,
  planned: TodayExercise,
  nowMs: number,
  seconds?: number,
): RecordWorkoutSetBody {
  const { session } = state
  const shown = shownValuesOf(state)
  const measure =
    planned.exercise.kind === 'time'
      ? { seconds: seconds ?? (shown.seconds as number) }
      : { reps: shown.reps as number }
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
    loadG: shown.loadG,
    ...measure,
    performedAt: new Date(nowMs).toISOString(),
  }
}
