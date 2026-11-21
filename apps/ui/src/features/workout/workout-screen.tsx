'use client'

import { Button } from '@base-ui/react/button'
import { Progress } from '@base-ui/react/progress'
import { CloudOff } from 'lucide-react'
import { type Dispatch, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { formatLoadKg } from './format'
import { RestRing } from './rest-ring'
import type { TodayExercise } from './today.types'
import { useScreenWakeLock } from './use-screen-wake-lock'
import {
  announcementOf,
  createWorkoutFlow,
  currentExercise,
  type RecordedSet,
  upcomingExercise,
  type WorkoutFlowAction,
  type WorkoutSession,
  workoutFlowReducer,
} from './workout-flow'
import { postWorkoutSet } from './workout-set-client'

export type WorkoutScreenProps = WorkoutSession & { onFinish: () => void }

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

// Sends each set marked sending once; the rest starts without waiting (FR-005), and a
// resend goes out with the same id and body (FR-013).
function useSendRecordedSets(
  workoutId: string,
  recorded: readonly RecordedSet[],
  dispatch: Dispatch<WorkoutFlowAction>,
) {
  const inFlight = useRef(new Set<string>())
  useEffect(() => {
    for (const { body, status } of recorded) {
      if (status !== 'sending' || inFlight.current.has(body.id)) continue
      inFlight.current.add(body.id)
      postWorkoutSet(workoutId, body).then((result) => {
        inFlight.current.delete(body.id)
        dispatch({ type: 'sendResult', setId: body.id, result })
      })
    }
  }, [workoutId, recorded, dispatch])
}

function UnsentNotice({ count, onResend }: { count: number; onResend: () => void }) {
  return (
    <div className="flex items-center gap-(--space-12)">
      <CloudOff aria-hidden="true" className="size-[20px] opacity-60" />
      <span className="flex-1 text-[0.9375rem] opacity-60">
        {count === 1 ? 'Série não enviada' : `${count} séries não enviadas`}
      </span>
      <Button
        className="min-h-(--target-workout) rounded-(--radius-capsule) px-(--space-20) text-[1.0625rem] font-(--font-weight-semibold) active:opacity-60"
        onClick={onResend}
      >
        Reenviar
      </Button>
    </div>
  )
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

export function WorkoutScreen({ onFinish, ...session }: WorkoutScreenProps) {
  const [state, dispatch] = useReducer(workoutFlowReducer, session, createWorkoutFlow)
  useSendRecordedSets(session.workoutId, state.recorded, dispatch)
  const { day } = session
  const exerciseNumber = state.exerciseIndex + 1
  const setNumber = state.setNumber
  const planned: TodayExercise = currentExercise(state)
  const resting = state.phase === 'rest'
  const finished = state.phase === 'finished'
  const endRest = useCallback((nowMs: number) => dispatch({ type: 'restEnd', nowMs }), [])
  const restMsLeft = useRestClock(state.restEndsAtMs, endRest)
  const upcoming = upcomingExercise(state)
  useScreenWakeLock(resting)
  const recordedCount = state.recorded.filter(
    ({ body }) => body.plannedExerciseId === planned.plannedExerciseId,
  ).length
  const unsentCount = state.recorded.filter(({ status }) => status === 'failed').length
  const hasPendingSet = state.recorded.some(({ status }) => status !== 'sent')
  return (
    <main className="flex min-h-dvh flex-col gap-(--space-32) px-(--space-margin-inline) py-(--space-24)">
      <div className="glass flex min-h-(--target-workout) items-center gap-(--space-16) rounded-(--radius-capsule) px-(--space-20)">
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
      </div>
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
        {unsentCount > 0 ? (
          <UnsentNotice count={unsentCount} onResend={() => dispatch({ type: 'resend' })} />
        ) : null}
        <Button
          disabled={finished && hasPendingSet}
          focusableWhenDisabled
          className="min-h-(--target-workout) w-full rounded-(--radius-capsule) bg-[CanvasText] px-(--space-24) text-[1.0625rem] font-(--font-weight-semibold) text-[Canvas] active:opacity-60 data-disabled:opacity-40"
          onClick={finished ? onFinish : () => dispatch({ type: 'next', nowMs: Date.now() })}
        >
          {finished ? 'Fechar' : 'Próximo'}
        </Button>
      </div>
      {/* Mounted from the start: screen readers skip a live region born with its text. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcementOf(state)}
      </p>
    </main>
  )
}
