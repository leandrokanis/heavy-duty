'use client'

import { Progress } from '@base-ui/react/progress'
import { Check, ChevronRight, List, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { MotionButton } from '@/components/ui/motion-button'
import { useToast } from '@/components/ui/toast'
import { clearActiveWorkout, saveActiveWorkout } from '@/sync/active-workout-store'
import { loadLevels } from '@/sync/levels-cache'
import { useSyncQueue, useSyncSnapshot } from '@/sync/sync-context'
import { CorrectionSheet } from './correction-sheet'
import { DiscardSheet } from './discard-sheet'
import type { AdjustField } from './drag-adjust'
import { EndSheet } from './end-sheet'
import { ExerciseBar } from './exercise-bar'
import { formatDurationMinutes, formatSetShort } from './format'
import { LastSetButton } from './last-set-button'
import { LeftOutSummary } from './left-out-summary'
import { LetterBadge } from './letter-badge'
import { LevelCelebration } from './level-celebration'
import { LevelPanel } from './level-panel'
import { type RecordMark as RecordMarkValue, recordSetIdsOf } from './personal-records'
import { PointsFloat } from './points-float'
import { QueueNotices } from './queue-notices'
import { RecordMark } from './record-mark'
import { reopenRowsOf } from './reopen-rows'
import { ReopenSummary } from './reopen-summary'
import { SequenceSheet } from './sequence-sheet'
import { SetDots } from './set-dots'
import { SetPips } from './set-pips'
import { GAME_SOUND_KEY, useSoundPreference } from './sound-preference'
import { cueBetween } from './timer-cues'
import { RingSvg, TimerRing } from './timer-ring'
import type { TodayExercise } from './today.types'
import { defaultTonePlayer, type TonePlayer } from './tone-player'
import { useReopenWindows } from './use-reopen-windows'
import { useScreenWakeLock } from './use-screen-wake-lock'
import { ValueWheel } from './value-wheel'
import { LEVEL_CELEBRATION_MS, TICK_MS } from './workout.config'
import { WorkoutClock } from './workout-clock'
import {
  announcementOf,
  canSkipOf,
  currentExercise,
  deadlineOf,
  exerciseProgressOf,
  frozenLevelsOf,
  type LevelCelebration as LevelCelebrationValue,
  type LevelsBase,
  lastSetLevelsOf,
  lastSetOf,
  lastSetPointsOf,
  leftOutOf,
  levelCelebrationOf,
  levelUpTextOf,
  nextPositionOf,
  recordMarkOf,
  restMsLeftOf,
  type SetPointsView,
  type SetValues,
  sequenceOf,
  shownValuesOf,
  type TimerReading,
  timerReadingOf,
  upcomingExercise,
  type WorkoutFlowAction,
  type WorkoutFlowState,
  workoutFlowReducer,
} from './workout-flow'
import type { RecordWorkoutSetBody } from './workout-set.types'

export type WorkoutScreenProps = {
  // The state to start from: a new workout or one restored from the device.
  flow: WorkoutFlowState
  onFinish: () => void
  // The sound of the timer; a test passes one that records the cues.
  tonePlayer?: TonePlayer
}

function firstSetMsOf(recorded: RecordWorkoutSetBody[]): number {
  return Math.min(...recorded.map(({ performedAt }) => Date.parse(performedAt)))
}

const MS_PER_SECOND = 1000

// The total time from the tap on "Começar" to the end, in whole seconds.
function totalSecondsOf(session: WorkoutFlowState['session'], finishedAt: string): number {
  return Math.round((Date.parse(finishedAt) - Date.parse(session.startedAt)) / MS_PER_SECOND)
}

function valuesKeyOf({ loadG, reps, seconds }: RecordWorkoutSetBody): string {
  return `${loadG}:${reps ?? ''}:${seconds ?? ''}`
}

// Puts each new set in the queue before anything else (the data that matters), then the corrections
// of sets already queued (ADR-025), then the exercises left out, then the end of the workout, then
// saves the workout in progress; the rest starts without waiting for the send (FR-001, FR-005,
// FR-009). An ended workout is cleared from the device and handed to onFinish once its sets and its
// finish are queued (FR-018), with a toast of its total time when it recorded a set (D48). A discarded one takes its items out of the queue and queues its
// removal instead (ADR-032). A restored flow starts with its sets already in the ref, so they are
// not queued twice. Each state waits for the one before, so a discard never runs ahead of a set.
function usePersistWorkout(
  initial: WorkoutFlowState,
  state: WorkoutFlowState,
  onFinish: () => void,
): { stop: () => void; allQueued: boolean } {
  const queue = useSyncQueue()
  const toast = useToast()
  // The state whose items were all queued; a finished workout restored from the device was queued before.
  const [queuedState, setQueuedState] = useState<WorkoutFlowState | null>(
    initial.phase === 'finished' ? initial : null,
  )
  // The values of each set as they were last queued, by set id: a recorded set whose values differ
  // goes to the queue as a correction, after the set itself.
  const queued = useRef(new Map(initial.recorded.map((body) => [body.id, valuesKeyOf(body)])))
  const finishQueued = useRef(false)
  const closed = useRef(false)
  const writes = useRef<Promise<void>>(Promise.resolve())
  useEffect(() => {
    if (state === initial && state.phase !== 'ended') return
    const { workoutId } = state.session
    if (state.phase === 'discarded') {
      closed.current = true
      writes.current = writes.current.then(async () => {
        if (state.recorded.length > 0) await queue.discardWorkout(workoutId)
        await clearActiveWorkout()
        onFinish()
      })
      return
    }
    const fresh = state.recorded.filter(({ id }) => !queued.current.has(id))
    const corrected = state.recorded.filter(
      (body) => queued.current.has(body.id) && queued.current.get(body.id) !== valuesKeyOf(body),
    )
    for (const body of [...fresh, ...corrected]) queued.current.set(body.id, valuesKeyOf(body))
    const finish = finishQueued.current ? null : state.finish
    if (finish) finishQueued.current = true
    writes.current = writes.current.then(async () => {
      for (const body of fresh) await queue.enqueue(workoutId, body)
      for (const { id, loadG, reps, seconds } of corrected) {
        const measure = reps === undefined ? { seconds } : { reps }
        await queue.enqueueCorrection(workoutId, id, { loadG, ...measure })
      }
      // A workout with no set recorded has no finish, so no skip goes either (FR-016).
      if (finish) {
        for (const { plannedExerciseId, skippedAt } of leftOutOf(state)) {
          await queue.enqueueSkip(workoutId, { plannedExerciseId, skippedAt })
        }
        await queue.enqueueFinish(workoutId, finish)
      }
      setQueuedState(state)
      if (state.phase === 'ended') {
        closed.current = true
        await clearActiveWorkout()
        if (finish) {
          const seconds = totalSecondsOf(state.session, finish.finishedAt)
          toast.show(`Treino encerrado · ${formatDurationMinutes(seconds)}`)
        }
        onFinish()
      } else if (!closed.current) {
        await saveActiveWorkout(state, Date.now())
      }
    })
  }, [initial, state, queue, onFinish, toast])
  return {
    stop: () => {
      closed.current = true
    },
    allQueued: queuedState === state,
  }
}

// Reads the clock on every tick instead of counting ticks, so a phase does not drift and the first
// tick after the screen wakes up settles a phase that ran out in the background. The deadline is
// also checked when it arrives, so a restored timer that already ran out settles at once.
function usePhaseClock(deadlineMs: number | null, onReach: (nowMs: number) => void): number {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (deadlineMs === null) return
    const check = () => {
      const nowMs = Date.now()
      if (nowMs >= deadlineMs) onReach(nowMs)
      else setTick((tick) => tick + 1)
    }
    check()
    const interval = setInterval(check, TICK_MS)
    return () => clearInterval(interval)
  }, [deadlineMs, onReach])
  return Date.now()
}

// Plays the cue between the reading before and the one now. An idle screen has no clock, so its
// last reading is as old as the last render; the age counts only while a timer runs.
function useTimerCues(reading: TimerReading, tonePlayer: TonePlayer, soundOn: boolean): void {
  const previous = useRef<TimerReading | null>(null)
  useEffect(() => {
    const before = previous.current
    previous.current = reading
    if (before === null) return
    const cue = cueBetween(
      before.stage === 'off' ? { ...before, atMs: reading.atMs } : before,
      reading,
    )
    if (cue === null || !soundOn) return
    try {
      tonePlayer.play(cue)
    } catch {
      // The timer does not depend on the sound (FR-013).
    }
  }, [reading, tonePlayer, soundOn])
}

// The points of the set just recorded, until the next screen change: the float rises from them.
function shownPointsOf(state: WorkoutFlowState): SetPointsView | null {
  if (state.lastStep !== 'record' && state.lastStep !== 'timerEnd') return null
  return lastSetPointsOf(state)
}

// The vibration of the record in the prototype of the PO; Safari on iOS ignores it, and nothing
// depends on it (docs/gamificacao.md).
const RECORD_VIBRATION_MS = [20, 30, 20]

function vibrate(pattern: number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // The record shows on the screen with no vibration.
  }
}

// One sound per recorded set, and the sound and the vibration of a record after it, all under the
// switch of the game sound (D60).
function useGameSounds(
  shown: SetPointsView | null,
  isRecord: boolean,
  tonePlayer: TonePlayer,
  gameSoundOn: boolean,
): void {
  const playedSetId = useRef<string | null>(null)
  useEffect(() => {
    if (shown === null || playedSetId.current === shown.setId) return
    playedSetId.current = shown.setId
    if (!gameSoundOn) return
    try {
      tonePlayer.play(shown.bonus === null ? 'points' : 'pointsDoubled')
      if (isRecord) tonePlayer.play('record')
    } catch {
      // The points and the record show without the sound.
    }
    if (isRecord) vibrate(RECORD_VIBRATION_MS)
  }, [shown, isRecord, tonePlayer, gameSoundOn])
}

// When the queue empties, every set recorded so far is in the API: the levels it answers replace
// the provisional ones, and only the sets recorded after the answer are replayed on top (ADR-034).
function useLevelsFromApi(recordedCount: number): LevelsBase | null {
  const pendingCount = useSyncSnapshot().pending.length
  const [base, setBase] = useState<LevelsBase | null>(null)
  const hadPending = useRef(false)
  const recorded = useRef(recordedCount)
  recorded.current = recordedCount
  useEffect(() => {
    if (pendingCount > 0) {
      hadPending.current = true
      return
    }
    if (!hadPending.current) return
    hadPending.current = false
    const includedSetCount = recorded.current
    let current = true
    loadLevels().then((loaded) => {
      if (current && loaded.status === 'ok' && !('fromCache' in loaded)) {
        setBase({ levels: frozenLevelsOf(loaded.levels), includedSetCount })
      }
    })
    return () => {
      current = false
    }
  }, [pendingCount])
  return base
}

// The full screen of a new tier shows for its time and leaves; a new set brings its own.
function useCelebration(
  shown: SetPointsView | null,
  celebration: LevelCelebrationValue | null,
): (LevelCelebrationValue & { setId: string }) | null {
  const [visible, setVisible] = useState<(LevelCelebrationValue & { setId: string }) | null>(null)
  const setId = shown?.setId ?? null
  const latest = useRef(celebration)
  latest.current = celebration
  useEffect(() => {
    const reached = latest.current
    if (setId === null || reached === null) return
    setVisible({ ...reached, setId })
    const timer = setTimeout(() => setVisible(null), LEVEL_CELEBRATION_MS)
    return () => clearTimeout(timer)
  }, [setId])
  return visible
}

// A page that goes to the background may never see the finger leave the ring: the hold ends there.
function useReleaseInBackground(held: boolean, dispatch: (action: WorkoutFlowAction) => void) {
  useEffect(() => {
    if (!held) return
    const release = () => {
      if (document.visibilityState === 'hidden')
        dispatch({ type: 'releaseRest', nowMs: Date.now() })
    }
    document.addEventListener('visibilitychange', release)
    return () => document.removeEventListener('visibilitychange', release)
  }, [held, dispatch])
}

function CountdownArea({ value }: { value: number }) {
  return (
    <div className="relative mx-auto grid size-[240px] place-items-center">
      <RingSvg fractionLeft={null} />
      <div
        role="timer"
        aria-label="Contagem para começar"
        // A new key per number restarts the animation; with reduced motion it only fades.
        key={value}
        className="relative animate-[countdown-pop_var(--duration-countdown)_ease-out_both] font-(--font-weight-heavy) text-(length:--font-size-countdown) leading-none tabular-nums"
      >
        {value}
      </div>
    </div>
  )
}

function SetArea({
  planned,
  values,
  recordMark,
  afterPassage,
  onAdjust,
}: {
  planned: TodayExercise
  values: SetValues
  recordMark: RecordMarkValue | null
  afterPassage: boolean
  onAdjust: (field: AdjustField, steps: number) => void
}) {
  const timed = planned.exercise.kind === 'time'
  return (
    <div
      data-cue={afterPassage ? 'rest-end' : undefined}
      className="flex flex-col gap-(--space-16) data-[cue=rest-end]:animate-[rest-end_var(--duration-base)_ease-out]"
    >
      <ValueWheel
        field="loadG"
        label="Carga"
        adornment={recordMark ? <RecordMark mark={recordMark} /> : null}
        value={values.loadG}
        onAdjust={(steps) => onAdjust('loadG', steps)}
      />
      <ValueWheel
        field={timed ? 'seconds' : 'reps'}
        label={timed ? 'Tempo' : 'Repetições'}
        value={(timed ? values.seconds : values.reps) as number}
        onAdjust={(steps) => onAdjust(timed ? 'seconds' : 'reps', steps)}
      />
    </div>
  )
}

// The next exercise above "Próximo", with one small decorative dot per set of it.
function UpNext({ upcoming }: { upcoming: TodayExercise }) {
  return (
    <p className="m-0 flex h-8 items-center justify-center gap-(--space-8)">
      <ChevronRight
        aria-hidden="true"
        size={18}
        className="shrink-0 text-(--color-label-secondary)"
      />
      <span className="shrink-0 font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-callout)">
        A seguir
      </span>
      <span className="min-w-0 truncate font-(--font-weight-semibold) text-(--color-label) text-(length:--font-size-body)">
        {upcoming.exercise.name}
      </span>
      <SetPips total={upcoming.sets} recorded={0} />
    </p>
  )
}

const WARNING_SECONDS = 3

// The last seconds of the execution or the rest, when the ring takes the warning tone.
function isLastSeconds(msLeft: number): boolean {
  return Math.ceil(msLeft / 1000) <= WARNING_SECONDS
}

function ExecutionArea({ msLeft, totalSeconds }: { msLeft: number; totalSeconds: number }) {
  return (
    <TimerRing
      size="execution"
      tone={isLastSeconds(msLeft) ? 'warning' : 'default'}
      msLeft={msLeft}
      totalSeconds={totalSeconds}
      progressLabel="Execução restante"
      timerLabel="Tempo de execução"
    />
  )
}

export function WorkoutScreen({
  flow,
  onFinish,
  tonePlayer = defaultTonePlayer,
}: WorkoutScreenProps) {
  const [state, dispatch] = useReducer(workoutFlowReducer, flow)
  const { stop: stopSaving, allQueued } = usePersistWorkout(flow, state, onFinish)
  const toast = useToast()
  const { day } = state.session
  const exerciseNumber = exerciseProgressOf(state)
  const topControlRef = useRef<HTMLButtonElement>(null)
  const lastSetButtonRef = useRef<HTMLButtonElement>(null)
  const lastSet = lastSetOf(state)
  const setNumber = state.setNumber
  const planned: TodayExercise = currentExercise(state)
  const resting = state.phase === 'rest'
  const totalSets = day.exercises.reduce((total, { sets }) => total + sets, 0)
  const finished = state.phase === 'finished'
  const windows = useReopenWindows(finished && allQueued && state.recorded.length > 0)
  const timerOpen = state.phase === 'countdown' || state.phase === 'timing'
  const reachDeadline = useCallback(
    (nowMs: number) => dispatch({ type: resting ? 'restEnd' : 'timerReach', nowMs }),
    [resting],
  )
  const close = async () => {
    stopSaving()
    await clearActiveWorkout()
    onFinish()
  }
  const [soundOn, setSoundOn] = useSoundPreference()
  const [gameSoundOn, setGameSoundOn] = useSoundPreference(GAME_SOUND_KEY)
  const shownPoints = shownPointsOf(state)
  const isRecord =
    shownPoints !== null &&
    recordSetIdsOf(state.session.day.exercises, state.recorded).has(shownPoints.setId)
  useGameSounds(shownPoints, isRecord, tonePlayer, gameSoundOn)
  const levelsFromApi = useLevelsFromApi(state.recorded.length)
  const levelRows = lastSetLevelsOf(state, levelsFromApi ?? undefined)
  // The text and the full screen come from the levels frozen at the start, so the answer of the
  // API never repeats them.
  const provisionalRows = shownPoints ? lastSetLevelsOf(state) : []
  const levelUpText = levelUpTextOf(provisionalRows)
  const celebration = useCelebration(shownPoints, levelCelebrationOf(provisionalRows))
  const nowMs = usePhaseClock(deadlineOf(state), reachDeadline)
  const reading = timerReadingOf(state, nowMs)
  useTimerCues(reading, tonePlayer, soundOn)
  const restMsLeft = restMsLeftOf(state, nowMs)
  const restHeld = state.restHoldStartedAtMs !== null
  useReleaseInBackground(restHeld, dispatch)
  // One switch for the timer and the rest: the preference is the same (heavy-duty:sound).
  const soundSwitch = (
    <Button
      variant="secondary"
      size="workout"
      aria-pressed={soundOn}
      icon={soundOn ? Volume2 : VolumeX}
      onClick={() => {
        // Turning the sound on is a tap, so the browser lets the audio play from here.
        if (!soundOn) tonePlayer.unlock()
        setSoundOn(!soundOn)
      }}
    >
      Som
    </Button>
  )
  const upcoming = upcomingExercise(state)
  useScreenWakeLock(resting || timerOpen)
  const recordedCount = state.recorded.filter(
    (body) => body.plannedExerciseId === planned.plannedExerciseId,
  ).length
  const sequence = sequenceOf(state)
  const currentDot = currentDotOf(state, recordedCount, planned.sets)
  const dots = (
    <Progress.Root
      aria-label="Séries"
      getAriaValueText={() => `${setNumber} de ${planned.sets}`}
      max={planned.sets}
      value={setNumber}
    >
      <SetDots total={planned.sets} recorded={recordedCount} current={currentDot} />
    </Progress.Root>
  )
  const title = (
    <h1 className="m-0 text-center font-(--font-weight-bold) text-(length:--font-size-title-1) leading-(--font-leading-title-1) tracking-(--font-tracking-title-1) text-balance">
      {planned.exercise.name}
    </h1>
  )
  // The toast of the correction is born from the same Salvar that changes the state, so Cancelar
  // and Escape never show it.
  const saveCorrection = (values: SetValues) => {
    const action = { type: 'correctLastSet', values, nowMs: Date.now() } as const
    const next = workoutFlowReducer(state, action)
    const corrected = next.recorded.at(-1)
    if (next !== state && next.lastStep === 'correct' && corrected) {
      toast.show(`Série corrigida: ${formatSetShort(corrected)}`, { announce: false })
    }
    dispatch(action)
  }
  return (
    <main className="mx-auto flex flex-1 w-full max-w-[640px] flex-col px-(--space-margin-inline)">
      <div className="mx-auto flex items-center gap-(--space-8)">
        <MotionButton
          ref={topControlRef}
          tapScale={1}
          aria-label={`Sequência do treino, letra ${day.letter}, exercício ${exerciseNumber} de ${day.exercises.length}`}
          className="flex min-h-(--target-workout) cursor-pointer select-none items-center gap-(--space-12) rounded-(--radius-capsule) pt-(--space-4) pr-(--space-12) pb-(--space-4) pl-(--space-8) transition-colors duration-(--duration-fast) data-disabled:opacity-45 data-pressed:bg-(--color-fill)"
          disabled={timerOpen}
          focusableWhenDisabled
          onClick={() => dispatch({ type: 'openSheet', sheet: 'sequence' })}
        >
          <LetterBadge letter={day.letter} size={30} />
          <Progress.Root
            aria-label="Exercícios"
            getAriaValueText={() => `${exerciseNumber} de ${day.exercises.length}`}
            max={day.exercises.length}
            value={exerciseNumber}
          >
            <ExerciseBar items={sequence} />
          </Progress.Root>
          <List aria-hidden="true" size={18} className="shrink-0 text-(--color-label-secondary)" />
        </MotionButton>
        <WorkoutClock
          startedAtMs={Date.parse(state.session.startedAt)}
          endedAtMs={finished && state.finish ? Date.parse(state.finish.finishedAt) : null}
        />
      </div>
      {resting ? (
        <>
          <div className="mt-(--space-32)">{title}</div>
          <div className="flex flex-1 flex-col items-center justify-center gap-(--space-16) py-(--space-16)">
            {restMsLeft !== null ? (
              <TimerRing
                tone={isLastSeconds(restMsLeft) ? 'warning' : 'default'}
                hold={{
                  active: restHeld,
                  onStart: () => dispatch({ type: 'holdRest', nowMs: Date.now() }),
                  onRelease: () => dispatch({ type: 'releaseRest', nowMs: Date.now() }),
                }}
                msLeft={restMsLeft}
                totalSeconds={planned.restSeconds}
                progressLabel="Descanso restante"
                timerLabel="Descanso"
              />
            ) : null}
            {dots}
            <div className="flex flex-wrap items-center justify-center gap-(--space-12)">
              {lastSet ? (
                <LastSetButton
                  ref={lastSetButtonRef}
                  set={lastSet.set}
                  record={lastSet.record}
                  onOpen={() => dispatch({ type: 'openSheet', sheet: 'correction' })}
                />
              ) : null}
              {soundSwitch}
            </div>
            <LevelPanel rows={levelRows} />
          </div>
        </>
      ) : finished ? (
        <div className="mt-(--space-32) flex flex-col items-center">
          <span
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-(--radius-circle) bg-(--color-success-soft)"
          >
            <Check
              aria-hidden="true"
              size={32}
              strokeWidth={2.2}
              className="text-(--color-success)"
            />
          </span>
          <h1 className="m-0 mt-(--space-8) text-center font-(--font-weight-bold) text-(length:--font-size-large-title) leading-(--font-leading-tight) tracking-(--font-tracking-tight)">
            Treino concluído
          </h1>
          {state.finish ? (
            <p className="m-0 mt-(--space-4) text-(--color-label-secondary) text-(length:--font-size-body) tabular-nums">
              {`Tempo total · ${formatDurationMinutes(totalSecondsOf(state.session, state.finish.finishedAt))}`}
            </p>
          ) : null}
          {lastSet ? (
            <div className="mt-(--space-16)">
              <LastSetButton
                ref={lastSetButtonRef}
                set={lastSet.set}
                record={lastSet.record}
                onOpen={() => dispatch({ type: 'openSheet', sheet: 'correction' })}
              />
            </div>
          ) : null}
          <QueueNotices align="center" className="mt-(--space-16) w-full" />
          <div className="mt-(--space-24) w-full">
            <LeftOutSummary items={leftOutOf(state)} />
          </div>
          {windows ? (
            <div className="mt-(--space-24) w-full">
              <ReopenSummary
                rows={reopenRowsOf({
                  day,
                  recorded: state.recorded,
                  windows,
                  workoutStartMs: firstSetMsOf(state.recorded),
                })}
                nowMs={Date.parse(windows.now)}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-(--space-32) flex flex-col items-center gap-(--space-16)">
            {dots}
            {title}
          </div>
          <div
            className={`flex flex-1 flex-col items-center py-(--space-16) ${
              state.phase === 'set' ? 'mt-(--space-16) justify-start' : 'justify-center'
            } gap-(--space-24)`}
          >
            {state.phase === 'set' ? (
              <div className="w-full">
                <SetArea
                  // A new key per set restarts the rest-end animation on every passage.
                  key={`${state.exerciseIndex}-${setNumber}`}
                  planned={planned}
                  values={shownValuesOf(state)}
                  recordMark={recordMarkOf(state)}
                  afterPassage={state.lastStepAtMs !== null}
                  onAdjust={(field, steps) => dispatch({ type: 'adjust', field, steps })}
                />
              </div>
            ) : null}
            {reading.stage === 'countdown' ? <CountdownArea value={reading.value} /> : null}
            {reading.stage === 'execution' ? (
              <ExecutionArea
                msLeft={Math.max(0, (deadlineOf(state) as number) - nowMs)}
                totalSeconds={shownValuesOf(state).seconds as number}
              />
            ) : null}
            {timerOpen ? soundSwitch : null}
          </div>
        </>
      )}
      <div className="mt-auto flex flex-col gap-(--space-12) pb-(--space-32)">
        {finished ? null : <QueueNotices align="center" />}
        {resting && upcoming ? <UpNext upcoming={upcoming} /> : null}
        <div className="relative">
          {shownPoints ? (
            <PointsFloat
              key={shownPoints.setId}
              points={shownPoints.points}
              bonus={shownPoints.bonus}
            />
          ) : null}
          {timerOpen ? (
            <div className="grid grid-cols-[1fr_2fr] gap-(--space-12)">
              <Button
                variant="secondary"
                size="large"
                onClick={() => dispatch({ type: 'cancel', nowMs: Date.now() })}
              >
                Cancelar
              </Button>
              <Button
                size="large"
                icon={ChevronRight}
                iconPosition="end"
                disabled={state.phase === 'countdown'}
                focusableWhenDisabled
                onClick={() => {
                  tonePlayer.unlock()
                  dispatch({ type: 'next', nowMs: Date.now() })
                }}
              >
                Próximo
              </Button>
            </div>
          ) : finished ? (
            <Button size="large" onClick={close}>
              Fechar
            </Button>
          ) : (
            <Button
              size="large"
              icon={ChevronRight}
              iconPosition="end"
              onClick={() => {
                tonePlayer.unlock()
                dispatch({ type: 'next', nowMs: Date.now() })
              }}
            >
              Próximo
            </Button>
          )}
        </div>
      </div>
      <SequenceSheet
        open={state.sheet === 'sequence'}
        items={sequence}
        finished={finished}
        canSkip={canSkipOf(state)}
        gameSoundOn={gameSoundOn}
        onGameSoundChange={(next) => {
          // Turning the sound on is a tap, so the browser lets the audio play from here.
          if (next) tonePlayer.unlock()
          setGameSoundOn(next)
        }}
        returnFocusRef={topControlRef}
        onClose={() => dispatch({ type: 'closeSheet', nowMs: Date.now() })}
        onPick={(exerciseIndex) => {
          const nowMs = Date.now()
          dispatch({ type: 'goTo', exerciseIndex, nowMs })
          dispatch({ type: 'closeSheet', nowMs })
        }}
        onSkip={() => {
          const nowMs = Date.now()
          dispatch({ type: 'skip', nowMs })
          dispatch({ type: 'closeSheet', nowMs })
        }}
        onEnd={() => dispatch({ type: 'openSheet', sheet: 'confirmEnd' })}
        onDiscard={() => dispatch({ type: 'openSheet', sheet: 'confirmDiscard' })}
      />
      <EndSheet
        open={state.sheet === 'confirmEnd'}
        items={sequence}
        doneSets={state.recorded.length}
        leftSets={totalSets - state.recorded.length}
        returnFocusRef={topControlRef}
        onConfirm={() => dispatch({ type: 'end', nowMs: Date.now() })}
        onContinue={() => dispatch({ type: 'closeSheet', nowMs: Date.now() })}
      />
      <DiscardSheet
        open={state.sheet === 'confirmDiscard'}
        doneSets={state.recorded.length}
        returnFocusRef={topControlRef}
        onConfirm={() => dispatch({ type: 'discard' })}
        onContinue={() => dispatch({ type: 'closeSheet', nowMs: Date.now() })}
      />
      {lastSet ? (
        <CorrectionSheet
          open={state.sheet === 'correction'}
          exerciseName={lastSet.exerciseName}
          kind={lastSet.kind}
          set={lastSet.set}
          returnFocusRef={lastSetButtonRef}
          onCancel={() => dispatch({ type: 'closeSheet', nowMs: Date.now() })}
          onSave={saveCorrection}
        />
      ) : null}
      {celebration ? (
        <LevelCelebration
          key={celebration.setId}
          slug={celebration.slug}
          name={celebration.name}
          level={celebration.level}
          tier={celebration.tier}
        />
      ) : null}
      {/* Mounted from the start: screen readers skip a live region born with its text. */}
      <p role="status" aria-live="polite" className="sr-only">
        {[announcementOf(state), levelUpText].filter(Boolean).join('. ')}
      </p>
    </main>
  )
}

// The dot of the set the athlete is on: the one after the sets done. In the rest it is the next
// set, but only when that set belongs to the same exercise; the finished workout has none.
function currentDotOf(
  state: WorkoutFlowState,
  recordedCount: number,
  setsTotal: number,
): number | null {
  if (state.phase === 'finished') return null
  if (state.phase === 'rest') {
    const position = nextPositionOf(state)
    return position !== null && position.exerciseIndex === state.exerciseIndex
      ? position.setNumber - 1
      : null
  }
  return recordedCount < setsTotal ? recordedCount : null
}
