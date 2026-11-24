'use client'

import { ChevronLeft, Trash2, WifiOff } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { IconLink } from '@/components/ui/icon-link'
import { useToast } from '@/components/ui/toast'
import { SignInScreen } from '@/features/auth/sign-in-screen'
import { loadWorkoutsOnDevice } from '@/sync/workouts-on-device'
import { DeleteWorkoutSheet } from './delete-workout-sheet'
import type { HistoryWorkout } from './history.types'
import { deleteHistoryWorkout, fetchWorkoutHistory, type HistoryRange } from './history-client'
import { formatHistoryRange, formatWorkoutDate } from './history-format'
import { HistoryList, labelOf } from './history-list'
import { HISTORY_PATH, WORKOUT_PARAM } from './history-paths'
import { historyRangeOf } from './history-range'
import { WorkoutDetail } from './workout-detail'

type HistoryPage = { range: HistoryRange; workouts: HistoryWorkout[] }

type Removal = { status: 'idle' | 'confirming' | 'busy' | 'failed' }

type ScreenState =
  | { status: 'loading' }
  | { status: 'offline' }
  | { status: 'unauthenticated' }
  | { status: 'ok'; pages: HistoryPage[]; more: 'idle' | 'loading' | 'offline' }

const PAGE_CLASS =
  'mx-auto flex flex-1 w-full max-w-[640px] flex-col px-(--space-margin-inline) pt-(--space-12) pb-(--space-24)'

const TITLE_CLASS =
  'm-0 font-(--font-weight-bold) text-(length:--font-size-large-title) leading-(--font-leading-tight) tracking-(--font-tracking-tight) outline-none'

// The API answers oldest first; the screen shows the newest first, page after page.
function newestFirst(pages: HistoryPage[]): HistoryWorkout[] {
  return pages.flatMap(({ workouts }) => [...workouts].reverse())
}

function withoutWorkout(pages: HistoryPage[], workoutId: string): HistoryPage[] {
  return pages.map((page) => ({
    ...page,
    workouts: page.workouts.filter(({ id }) => id !== workoutId),
  }))
}

function setCountOf(workout: HistoryWorkout): number {
  return workout.exercises.reduce((total, { sets }) => total + sets.length, 0)
}

// The history reads the API only: the phone keeps no copy, so it needs a connection (ADR-021).
export function HistoryScreen() {
  const selectedId = useSearchParams().get(WORKOUT_PARAM)
  const router = useRouter()
  const toast = useToast()
  const [nowMs] = useState(() => Date.now())
  const [state, setState] = useState<ScreenState>({ status: 'loading' })
  const [removal, setRemoval] = useState<Removal>({ status: 'idle' })
  // The workouts the phone may still send cannot be deleted here (ADR-032); unknown until read.
  const [onDevice, setOnDevice] = useState<Set<string> | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    loadWorkoutsOnDevice(Date.now()).then(setOnDevice)
  }, [])

  const loadFirstPage = useCallback(() => {
    setState({ status: 'loading' })
    const range = historyRangeOf(0, nowMs)
    fetchWorkoutHistory(range).then((result) => {
      if (result.status !== 'ok') setState({ status: result.status })
      else setState({ status: 'ok', pages: [{ range, workouts: result.workouts }], more: 'idle' })
    })
  }, [nowMs])

  useEffect(() => {
    loadFirstPage()
  }, [loadFirstPage])

  const loadOlderPage = () => {
    if (state.status !== 'ok' || state.more === 'loading') return
    const range = historyRangeOf(state.pages.length, nowMs)
    setState({ ...state, more: 'loading' })
    fetchWorkoutHistory(range).then((result) => {
      setState((current) => {
        if (current.status !== 'ok') return current
        if (result.status === 'unauthenticated') return { status: 'unauthenticated' }
        if (result.status === 'offline') return { ...current, more: 'offline' }
        return {
          status: 'ok',
          pages: [...current.pages, { range, workouts: result.workouts }],
          more: 'idle',
        }
      })
    })
  }

  const workouts = state.status === 'ok' ? newestFirst(state.pages) : []
  const selected = workouts.find((workout) => workout.id === selectedId) ?? null

  // The tapped link leaves the screen on opening and closing a detail: the title takes the focus.
  const shownId = selected?.id ?? null
  const lastShownId = useRef(shownId)
  useEffect(() => {
    if (lastShownId.current === shownId) return
    lastShownId.current = shownId
    mainRef.current?.querySelector<HTMLElement>('h1')?.focus()
  }, [shownId])

  if (state.status === 'unauthenticated') {
    return <SignInScreen onSignedIn={loadFirstPage} />
  }

  // A direct call, not the queue: the history only shows with a connection (ADR-032).
  const confirmRemoval = async (workout: HistoryWorkout) => {
    if (removal.status === 'busy') return
    setRemoval({ status: 'busy' })
    const result = await deleteHistoryWorkout(workout.id)
    if (result.status === 'failed') {
      setRemoval({ status: 'failed' })
      return
    }
    setRemoval({ status: 'idle' })
    if (result.status === 'unauthenticated') {
      setState({ status: 'unauthenticated' })
      return
    }
    setState((current) =>
      current.status === 'ok'
        ? { ...current, pages: withoutWorkout(current.pages, workout.id) }
        : current,
    )
    router.replace(HISTORY_PATH)
    toast.show('Treino apagado')
  }

  if (selected) {
    return (
      <main ref={mainRef} className={PAGE_CLASS}>
        <nav className="flex min-h-(--target-min) items-center">
          <IconLink href={HISTORY_PATH} icon={ChevronLeft} aria-label="Voltar ao histórico" />
        </nav>
        <div className="mt-(--space-8)">
          <WorkoutDetail workout={selected} nowMs={nowMs} />
        </div>
        {onDevice !== null && !onDevice.has(selected.id) ? (
          <>
            <Button
              ref={deleteButtonRef}
              variant="destructive"
              size="large"
              icon={Trash2}
              className="mt-(--space-32) w-full"
              onClick={() => setRemoval({ status: 'confirming' })}
            >
              Apagar treino
            </Button>
            <DeleteWorkoutSheet
              open={removal.status !== 'idle'}
              title={`${labelOf(selected)} · ${formatWorkoutDate(selected.startedAt, nowMs)}`}
              setCount={setCountOf(selected)}
              busy={removal.status === 'busy'}
              failed={removal.status === 'failed'}
              returnFocusRef={deleteButtonRef}
              onConfirm={() => void confirmRemoval(selected)}
              onCancel={() => {
                if (removal.status !== 'busy') setRemoval({ status: 'idle' })
              }}
            />
          </>
        ) : null}
      </main>
    )
  }

  return (
    <main
      ref={mainRef}
      aria-busy={state.status === 'loading' ? 'true' : undefined}
      className={PAGE_CLASS}
    >
      <nav className="flex min-h-(--target-min) items-center">
        <IconLink href="/" icon={ChevronLeft} aria-label="Voltar ao treino do dia" />
      </nav>
      <h1 tabIndex={-1} className={`mt-(--space-8) ${TITLE_CLASS}`}>
        Histórico
      </h1>
      <div className="mt-(--space-24)">
        {state.status === 'loading' ? <HistorySkeleton /> : null}
        {state.status === 'offline' ? <HistoryOffline onRetry={loadFirstPage} /> : null}
        {state.status === 'ok' ? (
          <HistoryPages
            pages={state.pages}
            workouts={workouts}
            more={state.more}
            nowMs={nowMs}
            onMore={loadOlderPage}
          />
        ) : null}
      </div>
    </main>
  )
}

type HistoryPagesProps = {
  pages: HistoryPage[]
  workouts: HistoryWorkout[]
  more: 'idle' | 'loading' | 'offline'
  nowMs: number
  onMore: () => void
}

function HistoryPages({ pages, workouts, more, nowMs, onMore }: HistoryPagesProps) {
  const lastPage = pages.at(-1)
  const lastPageEmpty = pages.length > 1 && lastPage && lastPage.workouts.length === 0
  return (
    <div className="flex flex-col gap-(--space-16)">
      {pages.length === 1 && workouts.length === 0 ? (
        <p className="m-0 rounded-(--radius-card) bg-(--color-background-grouped) px-(--space-20) py-(--space-24) text-center text-(--color-label-secondary)">
          Nenhum treino nos últimos 92 dias. Os treinos registrados no celular aparecem aqui.
        </p>
      ) : null}
      {workouts.length > 0 ? <HistoryList workouts={workouts} nowMs={nowMs} /> : null}
      <div aria-live="polite" className="contents">
        {lastPageEmpty ? (
          <p className="m-0 text-center text-(--color-label-secondary) text-(length:--font-size-subheadline)">
            {`Nenhum treino de ${formatHistoryRange(lastPage.range)}.`}
          </p>
        ) : null}
        {more === 'offline' ? (
          <p className="m-0 text-center text-(--color-label-secondary) text-(length:--font-size-subheadline)">
            Sem conexão. Tente de novo.
          </p>
        ) : null}
      </div>
      <Button
        variant="secondary"
        className="w-full"
        aria-busy={more === 'loading' ? 'true' : undefined}
        onClick={onMore}
      >
        Treinos anteriores
      </Button>
    </div>
  )
}

function HistoryOffline({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-(--space-16) pt-(--space-24) text-center">
      <WifiOff
        aria-hidden="true"
        size={44}
        strokeWidth={1.8}
        className="text-(--color-label-secondary)"
      />
      <h2 className="m-0 font-(--font-weight-bold) text-(length:--font-size-title-2)">
        Sem conexão
      </h2>
      <Button variant="secondary" size="large" className="w-full" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-(--radius-card) bg-(--color-background-grouped)"
    >
      {['first', 'second', 'third'].map((row) => (
        <div key={row} className="flex h-[72px] items-center gap-(--space-16) px-(--space-16)">
          <span className="size-11 shrink-0 rounded-(--radius-circle) bg-(--color-fill)" />
          <span className="h-[14px] w-2/5 rounded-(--radius-capsule) bg-(--color-fill)" />
        </div>
      ))}
    </div>
  )
}
