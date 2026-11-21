'use client'

import { Button } from '@base-ui/react/button'
import { Progress } from '@base-ui/react/progress'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { clearActiveWorkout, saveActiveWorkout } from '@/sync/active-workout-store'
import { useSyncQueue } from '@/sync/sync-context'
import { EndSheet } from './end-sheet'
import { formatLoadKg } from './format'
import { PendingSetsIndicator } from './pending-sets-indicator'
import { RejectedSetsNotice } from './rejected-sets-notice'
import { RestRing } from './rest-ring'
import { SequenceSheet } from './sequence-sheet'
import type { TodayExercise } from './today.types'
import { useScreenWakeLock } from './use-screen-wake-lock'
import {
  announcementOf,
  currentExercise,
  exerciseProgressOf,
  sequenceOf,
  upcomingExercise,
  type WorkoutFlowState,
  workoutFlowReducer,
} from './workout-flow'

export type WorkoutScreenProps = {
  // The state to start from: a new workout or one restored from the device.
  flow: WorkoutFlowState
  onFinish: () => void
}

type Measure = { value: string; unit: string }

function targetOf(planned: TodayExercise): Measure {
  if (planned.exercise.kind === 'time') return { value: String(planned.targetSeconds), unit: 's' }
  return { value: String(planned.targetReps), unit: 'rep' }
}

function MeasureValue({ label, measure }: { label: string; measure: Measure }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a read-only value is not a form, so no fieldset.
    <div role="group" aria-label={label} className="flex items-baseline gap-(--space-8)">
      <span className="text-[5rem] leading-none font-(--font-weight-semibold) tabular-nums">
        {measure.value}
      </span>
      <span className="text-[1.25rem] font-(--font-weight-regular) opacity-60">{measure.unit}</span>
    </div>
  )
}

// Puts each new set in the queue before anything else (the data that matters), then the end of
// the workout, then saves the workout in progress; the rest starts without waiting for the send
// (FR-001, FR-005, FR-009). An ended workout is cleared from the device and handed to onFinish
// once its sets and its finish are queued (FR-018). A restored flow starts with its sets already
// in the ref, so they are not queued twice.
function usePersistWorkout(
  initial: WorkoutFlowState,
  state: WorkoutFlowState,
  onFinish: () => void,
): () => void {
  const queue = useSyncQueue()
  const queued = useRef(new Set(initial.recorded.map(({ id }) => id)))
  const finishQueued = useRef(false)
  const closed = useRef(false)
  useEffect(() => {
    if (state === initial && state.phase !== 'ended') return
    const fresh = state.recorded.filter(({ id }) => !queued.current.has(id))
    for (const { id } of fresh) queued.current.add(id)
    const finish = finishQueued.current ? null : state.finish
    if (finish) finishQueued.current = true
    void (async () => {
      for (const body of fresh) await queue.enqueue(state.session.workoutId, body)
      if (finish) await queue.enqueueFinish(state.session.workoutId, finish)
      if (state.phase === 'ended') {
        closed.current = true
        await clearActiveWorkout()
        onFinish()
      } else if (!closed.current) {
        await saveActiveWorkout(state, Date.now())
      }
    })()
  }, [initial, state, queue, onFinish])
  return () => {
    closed.current = true
  }
}

const REST_TICK_MS = 250

// Reads the clock on every tick instead of counting ticks, so the rest does not drift and the
// first tick after the screen wakes up ends a rest that ran out in the background.
function useRestClock(restEndsAtMs: number | null, onEnd: (nowMs: number) => void): number | null {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (restEndsAtMs === null) return
    const interval = setInterval(() => {
      const nowMs = Date.now()
      if (nowMs >= restEndsAtMs) onEnd(nowMs)
      else setTick((tick) => tick + 1)
    }, REST_TICK_MS)
    return () => clearInterval(interval)
  }, [restEndsAtMs, onEnd])
  if (restEndsAtMs === null) return null
  return Math.max(0, restEndsAtMs - Date.now())
}

function SetArea({ planned, afterPassage }: { planned: TodayExercise; afterPassage: boolean }) {
  return (
    <div
      data-cue={afterPassage ? 'rest-end' : undefined}
      className="flex flex-col gap-(--space-24) data-[cue=rest-end]:animate-[rest-end_var(--duration-base)_ease-out]"
    >
      <MeasureValue label="Carga" measure={{ value: formatLoadKg(planned.loadG), unit: 'kg' }} />
      <MeasureValue label="Alvo" measure={targetOf(planned)} />
    </div>
  )
}

function RestArea({
  msLeft,
  planned,
  upcoming,
}: {
  msLeft: number
  planned: TodayExercise
  upcoming: TodayExercise | null
}) {
  return (
    <div className="flex flex-col gap-(--space-24)">
      <RestRing msLeft={msLeft} restSeconds={planned.restSeconds} />
      {upcoming ? (
        <p className="flex flex-col items-center gap-(--space-4)">
          <span className="text-[0.9375rem] opacity-60">A seguir</span>
          <span className="text-[1.25rem] font-(--font-weight-semibold)">
            {upcoming.exercise.name}
          </span>
        </p>
      ) : null}
    </div>
  )
}

function dotClassOf(index: number, recordedCount: number, resting: boolean): string {
  if (index < recordedCount) return 'bg-[CanvasText]'
  if (index === recordedCount && !resting) return 'border-2 border-[CanvasText]'
  return 'bg-[color-mix(in_srgb,CanvasText_20%,transparent)]'
}

export function WorkoutScreen({ flow, onFinish }: WorkoutScreenProps) {
  const [state, dispatch] = useReducer(workoutFlowReducer, flow)
  const stopSaving = usePersistWorkout(flow, state, onFinish)
  const { day } = state.session
  const exerciseNumber = exerciseProgressOf(state)
  const topControlRef = useRef<HTMLButtonElement>(null)
  const setNumber = state.setNumber
  const planned: TodayExercise = currentExercise(state)
  const resting = state.phase === 'rest'
  const totalSets = day.exercises.reduce((total, { sets }) => total + sets, 0)
  const finished = state.phase === 'finished'
  const endRest = useCallback((nowMs: number) => dispatch({ type: 'restEnd', nowMs }), [])
  const close = async () => {
    stopSaving()
    await clearActiveWorkout()
    onFinish()
  }
  const restMsLeft = useRestClock(state.restEndsAtMs, endRest)
  const upcoming = upcomingExercise(state)
  useScreenWakeLock(resting)
  const recordedCount = state.recorded.filter(
    (body) => body.plannedExerciseId === planned.plannedExerciseId,
  ).length
  return (
    <main className="flex min-h-dvh flex-col gap-(--space-32) px-(--space-margin-inline) py-(--space-24)">
      <Button
        ref={topControlRef}
        aria-label={`Sequência do treino, letra ${day.letter}, exercício ${exerciseNumber} de ${day.exercises.length}`}
        className="glass flex min-h-(--target-workout) items-center gap-(--space-16) rounded-(--radius-capsule) px-(--space-20) active:opacity-60"
        onClick={() => dispatch({ type: 'openSheet', sheet: 'sequence' })}
      >
        <span className="text-[1.25rem] font-(--font-weight-semibold)">{day.letter}</span>
        <Progress.Root
          aria-label="Exercícios"
          className="flex-1"
          getAriaValueText={() => `${exerciseNumber} de ${day.exercises.length}`}
          max={day.exercises.length}
          value={exerciseNumber}
        >
          <Progress.Track className="h-[6px] overflow-hidden rounded-(--radius-capsule) bg-[color-mix(in_srgb,CanvasText_15%,transparent)]">
            <Progress.Indicator className="bg-[CanvasText]" />
          </Progress.Track>
        </Progress.Root>
      </Button>
      <h1 className="text-[1.75rem] font-(--font-weight-semibold)">
        {finished ? 'Treino concluído' : planned.exercise.name}
      </h1>
      <Progress.Root
        aria-label="Séries"
        getAriaValueText={() => `${setNumber} de ${planned.sets}`}
        max={planned.sets}
        value={setNumber}
      >
        <div aria-hidden="true" className="flex gap-(--space-8)">
          {Array.from({ length: planned.sets }, (_, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: the dots are positions, not items
              key={index}
              data-recorded={index < recordedCount ? 'true' : undefined}
              className={`size-[10px] rounded-(--radius-circle) ${dotClassOf(index, recordedCount, resting)}`}
            />
          ))}
        </div>
      </Progress.Root>
      {state.phase === 'set' ? (
        <SetArea
          // A new key per set restarts the rest-end animation on every passage.
          key={`${state.exerciseIndex}-${setNumber}`}
          planned={planned}
          afterPassage={state.lastStepAtMs !== null}
        />
      ) : null}
      {resting && restMsLeft !== null ? (
        <RestArea msLeft={restMsLeft} planned={planned} upcoming={upcoming} />
      ) : null}
      <div className="mt-auto flex flex-col gap-(--space-16)">
        <RejectedSetsNotice />
        <PendingSetsIndicator />
        <Button
          className="min-h-(--target-workout) w-full rounded-(--radius-capsule) bg-[CanvasText] px-(--space-24) text-[1.0625rem] font-(--font-weight-semibold) text-[Canvas] active:opacity-60"
          onClick={finished ? close : () => dispatch({ type: 'next', nowMs: Date.now() })}
        >
          {finished ? 'Fechar' : 'Próximo'}
        </Button>
      </div>
      <SequenceSheet
        open={state.sheet === 'sequence'}
        items={sequenceOf(state)}
        finished={finished}
        returnFocusRef={topControlRef}
        onClose={() => dispatch({ type: 'closeSheet', nowMs: Date.now() })}
        onPick={(exerciseIndex) => {
          const nowMs = Date.now()
          dispatch({ type: 'goTo', exerciseIndex, nowMs })
          dispatch({ type: 'closeSheet', nowMs })
        }}
        onEnd={() => dispatch({ type: 'openSheet', sheet: 'confirmEnd' })}
      />
      <EndSheet
        open={state.sheet === 'confirmEnd'}
        doneSets={state.recorded.length}
        leftSets={totalSets - state.recorded.length}
        returnFocusRef={topControlRef}
        onConfirm={() => dispatch({ type: 'end', nowMs: Date.now() })}
        onContinue={() => dispatch({ type: 'closeSheet', nowMs: Date.now() })}
      />
      {/* Mounted from the start: screen readers skip a live region born with its text. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcementOf(state)}
      </p>
    </main>
  )
}
