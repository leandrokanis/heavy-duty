'use client'

import { History } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { IconLink } from '@/components/ui/icon-link'
import { OfflineNotice } from '@/features/auth/offline-notice'
import { SignInScreen } from '@/features/auth/sign-in-screen'
import { loadActiveWorkout, saveActiveWorkout } from '@/sync/active-workout-store'
import { loadLevels } from '@/sync/levels-cache'
import { useSyncQueue, useSyncSnapshot } from '@/sync/sync-context'
import { type LoadedToday, loadToday } from '@/sync/today-cache'
import { loadWindows } from '@/sync/windows-cache'
import { createClientId } from './client-id'
import { GameStrip } from './game-strip'
import { LetterList } from './letter-list'
import type { MuscleGroupLevels } from './levels.types'
import { overallLevelViewOf } from './overall-level'
import { QueueNotices } from './queue-notices'
import { StartSheet } from './start-sheet'
import type { Today, TodayDay } from './today.types'
import { suggestedLetterOf } from './window-suggestion'
import type { ActivityWindows } from './windows.types'
import {
  createWorkoutFlow,
  frozenLevelsOf,
  frozenWindowsOf,
  restoreWorkoutFlow,
  type WorkoutFlowState,
  type WorkoutSession,
} from './workout-flow'
import { WorkoutScreen } from './workout-screen'

const WINDOW_TICK_MS = 60_000

const NO_PROGRAM = 'Nenhum programa cadastrado. Monte um programa pelo Claude.'
const NO_EXERCISES = 'O programa ativo não tem exercícios. Monte o programa pelo Claude.'

function emptyStateOf(today: Today): string | null {
  if (today.program === null) return NO_PROGRAM
  if (today.days.every((day) => day.exercises.length === 0)) return NO_EXERCISES
  return null
}

// The workout in progress is read from the device on opening, so a reload or a closed app resumes it.
export function TodayScreen() {
  const queue = useSyncQueue()
  const [result, setResult] = useState<LoadedToday | null>(null)
  const [windows, setWindows] = useState<ActivityWindows | null>(null)
  const [levels, setLevels] = useState<MuscleGroupLevels | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [sheetDay, setSheetDay] = useState<TodayDay | null>(null)
  // 'pending' until the device has answered whether a workout is in progress.
  const [flow, setFlow] = useState<WorkoutFlowState | null | 'pending'>('pending')

  // The windows and the levels come from the history the API holds, so they reload together.
  const reloadWindows = useCallback(() => {
    loadWindows().then((loaded) => {
      setWindows(loaded.status === 'ok' ? loaded.windows : null)
      setNowMs(Date.now())
    })
    loadLevels().then((loaded) => setLevels(loaded.status === 'ok' ? loaded.levels : null))
  }, [])

  // The queue sends again after each answer of the API, as it may be a session that came back.
  const refresh = useCallback(() => {
    setResult(null)
    loadToday().then((loaded) => {
      setResult(loaded)
      if (loaded.status === 'ok' && !('fromCache' in loaded)) void queue.flush()
    })
    reloadWindows()
  }, [queue, reloadWindows])

  // The windows asked before the queue sent the sets of a workout miss it: ask again once it is empty.
  const pendingCount = useSyncSnapshot().pending.length
  const hadPending = useRef(false)
  useEffect(() => {
    if (pendingCount > 0) hadPending.current = true
    else if (hadPending.current) {
      hadPending.current = false
      reloadWindows()
    }
  }, [pendingCount, reloadWindows])

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), WINDOW_TICK_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    refresh()
    loadActiveWorkout(Date.now()).then((saved) =>
      setFlow(saved ? restoreWorkoutFlow(saved, Date.now()) : null),
    )
  }, [refresh])

  // Stable, as the workout screen hands an ended workout to it from an effect that depends on it.
  const finishWorkout = useCallback(() => {
    setFlow(null)
    refresh()
  }, [refresh])

  if (flow !== null && flow !== 'pending') {
    return <WorkoutScreen flow={flow} onFinish={finishWorkout} />
  }
  if (result?.status === 'offline') return <OfflineNotice onRetry={refresh} />
  if (result?.status === 'unauthenticated') {
    return (
      <SignInScreen
        onSignedIn={() => {
          void queue.flush()
          refresh()
        }}
      />
    )
  }

  return (
    <main
      aria-busy={result === null || flow === 'pending' ? 'true' : undefined}
      className="mx-auto flex flex-1 w-full max-w-[640px] flex-col px-(--space-margin-inline) pt-(--space-12) pb-(--space-24)"
    >
      <header className="flex items-center justify-between gap-(--space-12)">
        <h1 className="m-0 font-(--font-weight-bold) text-(length:--font-size-large-title) leading-(--font-leading-tight) tracking-(--font-tracking-tight)">
          Heavy Duty
        </h1>
        <IconLink href="/historico" icon={History} aria-label="Histórico" />
      </header>
      <QueueNotices align="start" className="mt-(--space-16)" />
      <div className="mt-(--space-24)">
        {result?.status === 'ok' ? (
          <TodayContent
            today={result.today}
            windows={windows}
            levels={levels}
            nowMs={nowMs}
            onSelect={(day) => {
              if (day.exercises.length > 0) setSheetDay(day)
            }}
          />
        ) : (
          <LetterListSkeleton />
        )}
      </div>
      <StartSheet
        day={sheetDay}
        onClose={() => setSheetDay(null)}
        onStart={(day) => {
          setSheetDay(null)
          if (result?.status === 'ok' && result.today.program) {
            const session = startSession(result.today.program.id, day, windows, levels)
            const started = createWorkoutFlow(session)
            void saveActiveWorkout(started, Date.now())
            setFlow(started)
          }
        }}
      />
    </main>
  )
}

// The workout id and start are born on the phone at "Começar"; the API creates the workout with the
// first set. The windows and the levels on screen, from the API or the copy on the device, freeze
// here (D56, ADR-034).
function startSession(
  programId: string,
  day: TodayDay,
  windows: ActivityWindows | null,
  levels: MuscleGroupLevels | null,
): WorkoutSession {
  const nowMs = Date.now()
  return {
    workoutId: createClientId(nowMs),
    startedAt: new Date(nowMs).toISOString(),
    programId,
    day,
    windows: frozenWindowsOf(windows),
    levels: frozenLevelsOf(levels),
  }
}

type TodayContentProps = {
  today: Today
  windows: ActivityWindows | null
  levels: MuscleGroupLevels | null
  nowMs: number
  onSelect: (day: TodayDay) => void
}

function TodayContent({ today, windows, levels, nowMs, onSelect }: TodayContentProps) {
  const emptyState = emptyStateOf(today)
  if (emptyState) {
    return (
      <p className="m-0 rounded-(--radius-card) bg-(--color-background-grouped) px-(--space-20) py-(--space-24) text-center text-(--color-label-secondary)">
        {emptyState}
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-(--space-16)">
      <GameStrip
        overallLevel={overallLevelViewOf(today, levels, windows, nowMs)}
        nowMs={nowMs}
        onSelectDay={onSelect}
      />
      <LetterList
        days={today.days}
        suggestedLetter={suggestedLetterOf(today, windows, levels, nowMs)}
        onSelect={onSelect}
        windows={windows}
        levels={levels}
        nowMs={nowMs}
      />
    </div>
  )
}

function LetterListSkeleton() {
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
