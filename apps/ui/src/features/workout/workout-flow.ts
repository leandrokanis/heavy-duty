import {
  addGroupGain,
  GAME_CONFIG,
  type GroupProgress,
  groupGainOf,
  isInWindowAt,
  multiplierPercentOf,
  type SetPlan,
  setPointsOf,
  startingProgress,
  type Tier,
  tierOf,
} from '@heavy-duty/game'
import { createClientId } from './client-id'
import { type AdjustField, adjustValue, MINIMUMS, valueTextOf } from './drag-adjust'
import type { MuscleGroupLevels } from './levels.types'
import { type RecordMark, recordMarkFor, recordSetIdsOf } from './personal-records'
import type { ExerciseKind, TodayDay, TodayExercise } from './today.types'
import type { ActivityWindows } from './windows.types'
import { COUNTDOWN_MS, DOUBLE_TAP_GUARD_MS, REST_FAST_FORWARD_FACTOR } from './workout.config'
import type { FinishWorkoutBody } from './workout-finish.types'
import type { RecordWorkoutSetBody } from './workout-set.types'

const MS_PER_SECOND = 1000

// The window of a muscle group as it stood at "Começar": the one of the training before (D56).
export type FrozenWindow = {
  muscleGroupSlug: string
  opensAt: string | null
  closesAt: string | null
}

// With no windows known, every set yields the common points until the API recalculates them.
export function frozenWindowsOf(windows: ActivityWindows | null): FrozenWindow[] {
  return (windows?.groups ?? []).map(({ muscleGroup, opensAt, closesAt }) => ({
    muscleGroupSlug: muscleGroup.slug,
    opensAt,
    closesAt,
  }))
}

// The level of a muscle group as it stood at "Começar", the base of the provisional bar (ADR-034).
export type FrozenLevel = GroupProgress & { muscleGroupSlug: string }

export function frozenLevelsOf(levels: MuscleGroupLevels | null): FrozenLevel[] {
  return (levels?.groups ?? []).map(({ muscleGroup, level, points, bestLevel }) => ({
    muscleGroupSlug: muscleGroup.slug,
    level,
    points,
    bestLevel,
  }))
}

export type WorkoutSession = {
  workoutId: string
  startedAt: string
  programId: string
  day: TodayDay
  // Frozen at the start, so the sets of this workout do not open a window that doubles them.
  windows: FrozenWindow[]
  // Frozen at the start; the screen swaps them for the answer of the API when the queue empties.
  levels: FrozenLevel[]
}

// The numbers on the set screen; reps or seconds is null for the other kind of exercise.
export type SetValues = { loadG: number; reps: number | null; seconds: number | null }

// Only the load goes on to the next set; reps and time always come from the program.
export type CarriedValues = Pick<SetValues, 'loadG'>

export type SheetName = 'none' | 'sequence' | 'confirmEnd' | 'confirmDiscard' | 'correction'

// An exercise the athlete skipped and did not do yet; the instant is the last skip (ADR-023).
export type SkippedMark = { plannedExerciseId: string; skippedAt: string }

export type WorkoutFlowState = {
  session: WorkoutSession
  // A discarded workout leaves the device and goes to the queue as a removal (ADR-032).
  phase: 'set' | 'countdown' | 'timing' | 'rest' | 'finished' | 'ended' | 'discarded'
  exerciseIndex: number
  setNumber: number
  // The end of the rest at the normal pace; a release of the hold moves it to the time left.
  restEndsAtMs: number | null
  // The instant the athlete pressed the ring of the rest, while the finger holds it; else null.
  restHoldStartedAtMs: number | null
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
    | 'correct'
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
  carriedValues: Record<string, CarriedValues>
}

export type WorkoutFlowAction =
  | { type: 'next'; nowMs: number }
  | { type: 'restEnd'; nowMs: number }
  | { type: 'holdRest'; nowMs: number }
  | { type: 'releaseRest'; nowMs: number }
  | { type: 'timerReach'; nowMs: number }
  | { type: 'cancel'; nowMs: number }
  | { type: 'goTo'; exerciseIndex: number; nowMs: number }
  | { type: 'openSheet'; sheet: Exclude<SheetName, 'none'> }
  | { type: 'closeSheet'; nowMs: number }
  | { type: 'skip'; nowMs: number }
  | { type: 'end'; nowMs: number }
  | { type: 'discard' }
  | { type: 'adjust'; field: AdjustField; steps: number }
  | { type: 'correctLastSet'; values: SetValues; nowMs: number }

export function createWorkoutFlow(session: WorkoutSession): WorkoutFlowState {
  return {
    session,
    phase: 'set',
    exerciseIndex: 0,
    setNumber: 1,
    restEndsAtMs: null,
    restHoldStartedAtMs: null,
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

// A set as the athlete recorded it: the sent values, not the planned ones (FR-002); record is
// present only on a set that beat a personal record.
export type RecordedSetView = Pick<
  RecordWorkoutSetBody,
  'setNumber' | 'loadG' | 'reps' | 'seconds'
> & { record?: true }

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
  const records = recordSetIdsOf(state.session.day.exercises, state.recorded)
  return state.recorded
    .filter((body) => body.plannedExerciseId === planned.plannedExerciseId)
    .sort((a, b) => a.setNumber - b.setNumber)
    .map(({ id, setNumber, loadG, reps, seconds }) => ({
      setNumber,
      loadG,
      ...(reps === undefined ? {} : { reps }),
      ...(seconds === undefined ? {} : { seconds }),
      ...(records.has(id) ? { record: true as const } : {}),
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

// The values on the set screen: the adjusted ones, else the filled ones with the load the last
// record of the exercise carries (#57).
export function shownValuesOf(state: WorkoutFlowState): SetValues {
  const planned = currentExercise(state)
  const filled = filledValuesOf(planned)
  const carried = state.carriedValues[planned.plannedExerciseId]
  return state.draft ?? { ...filled, loadG: carried?.loadG ?? filled.loadG }
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
// The value is the count number or the seconds left of the execution or the rest, 0 off a timer.
export type TimerReading = {
  stage: 'off' | 'countdown' | 'execution' | 'rest'
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
  const restMsLeft = restMsLeftOf(state, nowMs)
  if (restMsLeft !== null) {
    const value = Math.ceil(restMsLeft / MS_PER_SECOND)
    return { stage: 'rest', value, lastStep, atMs: nowMs }
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
  if (state.phase !== 'rest' || state.restEndsAtMs === null) return null
  const holdMs = state.restHoldStartedAtMs
  if (holdMs === null) return state.restEndsAtMs
  return holdMs + Math.ceil(Math.max(0, state.restEndsAtMs - holdMs) / REST_FAST_FORWARD_FACTOR)
}

// The time left of the rest, never below 0; while the ring is held it falls
// REST_FAST_FORWARD_FACTOR times faster than the clock. Null outside the rest.
export function restMsLeftOf(state: WorkoutFlowState, nowMs: number): number | null {
  if (state.phase !== 'rest' || state.restEndsAtMs === null) return null
  const holdMs = state.restHoldStartedAtMs
  if (holdMs === null || nowMs < holdMs) return Math.max(0, state.restEndsAtMs - nowMs)
  const leftAtHoldMs = state.restEndsAtMs - holdMs
  return Math.max(0, leftAtHoldMs - REST_FAST_FORWARD_FACTOR * (nowMs - holdMs))
}

// Text of the polite live region: the set just recorded, then the set now on screen, if any.
export function announcementOf(state: WorkoutFlowState): string {
  if (state.lastStep === 'begin') return 'Começou'
  if (state.lastStep === 'cancel') return positionText(state)
  if (state.lastStep === 'correct') return correctedText(state)
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
  const recordedText = `Série ${last.setNumber} de ${planned.sets} registrada, ${pointsText(state)}`
  if (state.phase === 'finished') return `${recordedText}. Treino concluído${leftOutText(state)}`
  if (state.phase === 'set') return `${recordedText}. ${positionText(state)}`
  return recordedText
}

function pointsText(state: WorkoutFlowState): string {
  const { points, doubled } = lastSetPointsOf(state) as SetPointsView
  const text = `${points} ${points === 1 ? 'ponto' : 'pontos'}`
  return doubled ? `${text} em dobro` : text
}

export type SetPointsView = { setId: string; points: number; doubled: boolean }

function plannedOf(state: WorkoutFlowState, set: RecordWorkoutSetBody): TodayExercise {
  return state.session.day.exercises.find(
    ({ plannedExerciseId }) => plannedExerciseId === set.plannedExerciseId,
  ) as TodayExercise
}

function planOf(planned: TodayExercise): SetPlan {
  return {
    plannedLoadG: planned.plannedLoadG,
    targetReps: planned.targetReps,
    targetSeconds: planned.targetSeconds,
  }
}

function measureOf(set: RecordWorkoutSetBody) {
  return { loadG: set.loadG, reps: set.reps ?? null, seconds: set.seconds ?? null }
}

// The double of a group at the instant of the set, by its window frozen at the start: inside the
// window (D55, D56), or in a workout whose first set of the group came after the window closed,
// the first workout back (D53). A window that closes during the workout stops doubling.
function bonusesOf(state: WorkoutFlowState, slug: string, performedAt: string) {
  const window = state.session.windows.find(({ muscleGroupSlug }) => muscleGroupSlug === slug)
  if (window === undefined || window.closesAt === null) return { inWindow: false }
  const firstOfGroup = state.recorded.find((set) =>
    groupRolesOf(plannedOf(state, set)).some((group) => group.slug === slug),
  )
  return {
    inWindow: isInWindowAt(window, Date.parse(performedAt)),
    welcomeBack:
      firstOfGroup !== undefined &&
      Date.parse(firstOfGroup.performedAt) >= Date.parse(window.closesAt),
  }
}

function multiplierOfGroup(state: WorkoutFlowState, slug: string, performedAt: string): number {
  return multiplierPercentOf(bonusesOf(state, slug, performedAt))
}

// The provisional points of the last recorded set (ADR-034), against its plan in the workout of
// the day and the windows frozen at the start. Only the primary groups double it (decision 1 of
// US-F10-01), inside the window or back from the cooling.
export function lastSetPointsOf(state: WorkoutFlowState): SetPointsView | null {
  const set = state.recorded.at(-1)
  if (set === undefined) return null
  const planned = plannedOf(state, set)
  const multiplierPercent = Math.max(
    multiplierPercentOf({ inWindow: false }),
    ...planned.muscleGroups.map(({ slug }) => multiplierOfGroup(state, slug, set.performedAt)),
  )
  const points = setPointsOf(measureOf(set), planOf(planned), multiplierPercent)
  return {
    setId: set.id,
    points,
    doubled: multiplierPercent > multiplierPercentOf({ inWindow: false }),
  }
}

// The levels the provisional bar starts from: the answer of the API with the sets it already holds,
// or the levels frozen at the start with none of the sets of this workout.
export type LevelsBase = { levels: FrozenLevel[]; includedSetCount: number }

export type GroupLevelRow = {
  slug: string
  name: string
  before: GroupProgress
  after: GroupProgress
  gain: number
  levelsReached: number[]
}

type GroupRole = { slug: string; name: string; role: 'primary' | 'secondary' }

function groupRolesOf(planned: TodayExercise): GroupRole[] {
  const primary = new Set(planned.muscleGroups.map(({ slug }) => slug))
  return [
    ...planned.muscleGroups.map((group) => ({ ...group, role: 'primary' as const })),
    ...(planned.secondaryMuscleGroups ?? [])
      .filter(({ slug }) => !primary.has(slug))
      .map((group) => ({ ...group, role: 'secondary' as const })),
  ]
}

// Decision D54: the planned sets of the group in the letter, as the API freezes them in the set.
function plannedGroupSetsOf(state: WorkoutFlowState, slug: string): number {
  return state.session.day.exercises
    .filter(({ muscleGroups }) => muscleGroups.some((group) => group.slug === slug))
    .reduce((total, { sets }) => total + sets, 0)
}

// The gain of one group from one set, with the multiplier of the group itself (D55).
function groupGainOfSet(state: WorkoutFlowState, set: RecordWorkoutSetBody, group: GroupRole) {
  const planned = plannedOf(state, set)
  return groupGainOf(
    measureOf(set),
    planOf(planned),
    { role: group.role, plannedGroupSets: plannedGroupSetsOf(state, group.slug) },
    multiplierOfGroup(state, group.slug, set.performedAt),
  )
}

// The bar of each group of the last recorded set, before and after it: the base with the sets it
// does not hold yet replayed on top, the same rules the API runs over the whole history.
export function lastSetLevelsOf(state: WorkoutFlowState, base?: LevelsBase): GroupLevelRow[] {
  const last = state.recorded.at(-1)
  if (last === undefined) return []
  const baseLevels = base?.levels ?? state.session.levels
  // With no level known, as on a phone that never read them, the bar waits for the API.
  if (baseLevels.length === 0) return []
  const included = base?.includedSetCount ?? 0
  const progress = new Map(
    baseLevels.map(({ muscleGroupSlug, ...level }) => [muscleGroupSlug, level as GroupProgress]),
  )
  const progressOf = (slug: string) => progress.get(slug) ?? startingProgress()
  state.recorded.slice(included, -1).forEach((set) => {
    for (const group of groupRolesOf(plannedOf(state, set))) {
      progress.set(
        group.slug,
        addGroupGain(progressOf(group.slug), groupGainOfSet(state, set, group)).progress,
      )
    }
  })
  const lastIncluded = state.recorded.length <= included
  return groupRolesOf(plannedOf(state, last)).map((group) => {
    const before = progressOf(group.slug)
    const gain = groupGainOfSet(state, last, group)
    const added = lastIncluded
      ? { progress: before, levelsReached: [] }
      : addGroupGain(before, gain)
    return {
      slug: group.slug,
      name: group.name,
      before,
      after: added.progress,
      gain,
      levelsReached: added.levelsReached,
    }
  })
}

function capitalized(text: string): string {
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1)
}

// The text of the live region for the groups that climbed: "Peito subiu para o nível 4".
export function levelUpTextOf(rows: GroupLevelRow[]): string {
  return rows
    .filter(({ levelsReached }) => levelsReached.length > 0)
    .map(({ name, after }) => `${capitalized(name)} subiu para o nível ${after.level}`)
    .join('. ')
}

export type LevelCelebration = { slug: string; name: string; level: number; tier: Tier }

const CELEBRATED_LEVELS = new Set([
  ...Object.values(GAME_CONFIG.tierStartLevels),
  GAME_CONFIG.maxLevel,
])

// The first level of a tier and the top level show in full screen (docs/gamificacao.md).
export function levelCelebrationOf(rows: GroupLevelRow[]): LevelCelebration | null {
  for (const { slug, name, levelsReached } of rows) {
    const level = [...levelsReached].reverse().find((reached) => CELEBRATED_LEVELS.has(reached))
    if (level !== undefined) return { slug, name, level, tier: tierOf(level) }
  }
  return null
}

// The values of a set as spoken: "42,5 quilos, 10 repetições".
export function setValuesText(
  set: Pick<RecordWorkoutSetBody, 'loadG' | 'reps' | 'seconds'>,
): string {
  const measure =
    set.reps === undefined
      ? valueTextOf('seconds', set.seconds as number)
      : valueTextOf('reps', set.reps)
  return `${valueTextOf('loadG', set.loadG)}, ${measure}`
}

// A correction that closed over a rest that had run out also passes to the next set.
function correctedText(state: WorkoutFlowState): string {
  const last = state.recorded.at(-1) as RecordWorkoutSetBody
  const corrected = `Série corrigida: ${setValuesText(last)}`
  return state.phase === 'set' ? `${corrected}. ${positionText(state)}` : corrected
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

// A state saved before #57 carried the reps and the time too; only the load stays.
function carriedLoadsOf(
  carried: Record<string, CarriedValues> | undefined,
): Record<string, CarriedValues> {
  return Object.fromEntries(
    Object.entries(carried ?? {}).flatMap(([plannedExerciseId, { loadG }]) =>
      Number.isSafeInteger(loadG) && loadG >= MINIMUMS.loadG
        ? [[plannedExerciseId, { loadG }]]
        : [],
    ),
  )
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
// A hold left open counts as released at its start, the only instant known to have happened.
// Saved values that are not integers above the minimum are dropped, so the body stays valid.
export function restoreWorkoutFlow(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  const saved: WorkoutFlowState = {
    ...state,
    session: {
      ...state.session,
      windows: state.session.windows ?? [],
      levels: state.session.levels ?? [],
    },
    restHoldStartedAtMs: null,
    skipped: state.skipped ?? [],
    draft: isValidValues(state.draft) ? state.draft : null,
    carriedValues: carriedLoadsOf(state.carriedValues),
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
    case 'holdRest':
      return state.phase === 'rest' && state.restHoldStartedAtMs === null
        ? { ...state, restHoldStartedAtMs: action.nowMs }
        : state
    case 'releaseRest':
      return releaseRest(state, action.nowMs)
    case 'timerReach':
      return reachTimer(state, action.nowMs)
    case 'cancel':
      return cancelTimer(state, action.nowMs)
    case 'goTo':
      return goTo(state, action.exerciseIndex, action.nowMs)
    case 'openSheet':
      return canOpenSheet(state, action.sheet) ? { ...state, sheet: action.sheet } : state
    case 'closeSheet':
      return closeSheet(state, action.nowMs)
    case 'skip':
      return skipExercise(state, action.nowMs)
    case 'end':
      return isTimerOpen(state) ? state : endWorkout(state, action.nowMs)
    case 'discard':
      return state.sheet === 'confirmDiscard' ? discardWorkout(state) : state
    case 'adjust':
      return adjustShown(state, action.field, action.steps)
    case 'correctLastSet':
      return correctLastSet(state, action.values, action.nowMs)
  }
}

// The correction opens over the last recorded set, in the rest or on the finished screen, with no
// other sheet open; only a workout in progress is discarded; the timer takes no sheet.
function canOpenSheet(state: WorkoutFlowState, sheet: Exclude<SheetName, 'none'>): boolean {
  if (isTimerOpen(state)) return false
  if (sheet === 'confirmDiscard') return state.phase === 'set' || state.phase === 'rest'
  return sheet !== 'correction' || (state.sheet === 'none' && lastSetOf(state) !== null)
}

// The sets stay in the state only to count them; the screen takes the workout out of the queue.
function discardWorkout(state: WorkoutFlowState): WorkoutFlowState {
  return {
    ...state,
    phase: 'discarded',
    restEndsAtMs: null,
    restHoldStartedAtMs: null,
    sheet: 'none',
    lastStep: null,
    finish: null,
  }
}

export type LastSetView = {
  set: RecordWorkoutSetBody
  exerciseName: string
  kind: ExerciseKind
  setsTotal: number
  // Derived from the sets, so a correction of the last set redoes it.
  record: boolean
}

// The set the correction would change: the last recorded one, while the athlete is in the rest or
// the workout is finished. Null on the set screen, in the timer and before any record.
export function lastSetOf(state: WorkoutFlowState): LastSetView | null {
  if (state.phase !== 'rest' && state.phase !== 'finished') return null
  const set = state.recorded.at(-1)
  if (set === undefined) return null
  const planned = state.session.day.exercises.find(
    ({ plannedExerciseId }) => plannedExerciseId === set.plannedExerciseId,
  ) as TodayExercise
  return {
    set,
    exerciseName: planned.exercise.name,
    kind: planned.exercise.kind,
    setsTotal: planned.sets,
    record: recordSetIdsOf(state.session.day.exercises, state.recorded).has(set.id),
  }
}

// The record mark beside the load of the set on screen; null outside the set screen.
export function recordMarkOf(state: WorkoutFlowState): RecordMark | null {
  if (state.phase !== 'set') return null
  return recordMarkFor(currentExercise(state), state.recorded, shownValuesOf(state))
}

// "Salvar" of the correction sheet. Valid new values replace the load and the measure of the last
// set; equal ones only close the sheet. Closing works as closeSheet: a rest that ran out under the
// sheet passes to the next set now, and only then does the guard start.
function correctLastSet(
  state: WorkoutFlowState,
  values: SetValues,
  nowMs: number,
): WorkoutFlowState {
  const last = lastSetOf(state)
  if (state.sheet !== 'correction' || last === null || !isValidCorrection(last.kind, values)) {
    return state
  }
  const corrected = isSameValues(last.set, values) ? state : withCorrectedLastSet(state, values)
  return { ...closeSheet(corrected, nowMs), lastStep: 'correct' }
}

function isValidCorrection(kind: ExerciseKind, values: SetValues): boolean {
  const hasOwnMeasure = kind === 'reps' ? values.seconds === null : values.reps === null
  return hasOwnMeasure && isValidValues(values)
}

function isSameValues(set: RecordWorkoutSetBody, values: SetValues): boolean {
  return (
    set.loadG === values.loadG &&
    (set.reps ?? null) === values.reps &&
    (set.seconds ?? null) === values.seconds
  )
}

// The next set of the exercise starts from the corrected load; its reps or time stay the program's.
function withCorrectedLastSet(state: WorkoutFlowState, values: SetValues): WorkoutFlowState {
  const last = state.recorded.at(-1) as RecordWorkoutSetBody
  const planned = state.session.day.exercises.find(
    ({ plannedExerciseId }) => plannedExerciseId === last.plannedExerciseId,
  ) as TodayExercise
  const body: RecordWorkoutSetBody =
    planned.exercise.kind === 'reps'
      ? { ...last, loadG: values.loadG, reps: values.reps as number }
      : { ...last, loadG: values.loadG, seconds: values.seconds as number }
  return {
    ...state,
    recorded: [...state.recorded.slice(0, -1), body],
    carriedValues: {
      ...state.carriedValues,
      [planned.plannedExerciseId]: { loadG: values.loadG },
    },
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
  if (state.phase === 'finished' || state.phase === 'ended' || state.phase === 'discarded') {
    return state
  }
  const finish: FinishWorkoutBody | null =
    state.recorded.length === 0
      ? null
      : { finishedAt: new Date(nowMs).toISOString(), endReason: 'ended_early' }
  return {
    ...state,
    phase: 'ended',
    restEndsAtMs: null,
    restHoldStartedAtMs: null,
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
  return restMsLeftOf(state, nowMs) === 0
}

// The rest goes back to the normal pace from the time left at the release.
function releaseRest(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  const msLeft = restMsLeftOf(state, nowMs)
  if (state.restHoldStartedAtMs === null || msLeft === null) return state
  return { ...state, restEndsAtMs: nowMs + msLeft, restHoldStartedAtMs: null }
}

function advance(state: WorkoutFlowState, nowMs: number): WorkoutFlowState {
  const position = nextPositionOf(state) as Position
  return {
    ...state,
    ...position,
    phase: 'set',
    restEndsAtMs: null,
    restHoldStartedAtMs: null,
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
    carriedValues: {
      ...state.carriedValues,
      [planned.plannedExerciseId]: { loadG: shownValuesOf(state).loadG },
    },
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
