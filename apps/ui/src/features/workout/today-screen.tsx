'use client'

import { useCallback, useEffect, useState } from 'react'
import { OfflineNotice } from '@/features/auth/offline-notice'
import { SignInScreen } from '@/features/auth/sign-in-screen'
import { loadActiveWorkout, saveActiveWorkout } from '@/sync/active-workout-store'
import { useSyncQueue } from '@/sync/sync-context'
import { type LoadedToday, loadToday } from '@/sync/today-cache'
import { createClientId } from './client-id'
import { LetterList } from './letter-list'
import { PendingSetsIndicator } from './pending-sets-indicator'
import { RejectedSetsNotice } from './rejected-sets-notice'
import { StartSheet } from './start-sheet'
import type { Today, TodayDay } from './today.types'
import {
  createWorkoutFlow,
  restoreWorkoutFlow,
  type WorkoutFlowState,
  type WorkoutSession,
} from './workout-flow'
import { WorkoutScreen } from './workout-screen'

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
  const [sheetDay, setSheetDay] = useState<TodayDay | null>(null)
  // 'pending' until the device has answered whether a workout is in progress.
  const [flow, setFlow] = useState<WorkoutFlowState | null | 'pending'>('pending')

  // The queue sends again after each answer of the API, as it may be a session that came back.
  const refresh = useCallback(() => {
    setResult(null)
    loadToday().then((loaded) => {
      setResult(loaded)
      if (loaded.status === 'ok' && !('fromCache' in loaded)) void queue.flush()
    })
  }, [queue])

  useEffect(() => {
    refresh()
    loadActiveWorkout(Date.now()).then((saved) =>
      setFlow(saved ? restoreWorkoutFlow(saved, Date.now()) : null),
    )
  }, [refresh])

  if (flow !== null && flow !== 'pending') {
    return (
      <WorkoutScreen
        flow={flow}
        onFinish={() => {
          setFlow(null)
          refresh()
        }}
      />
    )
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
      className="flex min-h-dvh flex-col gap-(--space-24) px-(--space-margin-inline) py-(--space-24)"
    >
      <h1 className="text-[2rem] font-(--font-weight-semibold)">Heavy Duty</h1>
      {result?.status === 'ok' ? (
        <TodayContent
          today={result.today}
          onSelect={(day) => {
            if (day.exercises.length > 0) setSheetDay(day)
          }}
        />
      ) : (
        <LetterListSkeleton />
      )}
      <RejectedSetsNotice />
      <PendingSetsIndicator />
      <StartSheet
        day={sheetDay}
        onClose={() => setSheetDay(null)}
        onStart={(day) => {
          setSheetDay(null)
          if (result?.status === 'ok' && result.today.program) {
            const started = createWorkoutFlow(startSession(result.today.program.id, day))
            void saveActiveWorkout(started, Date.now())
            setFlow(started)
          }
        }}
      />
    </main>
  )
}

// The workout id and start are born on the phone at "Começar"; the API creates the workout with the first set.
function startSession(programId: string, day: TodayDay): WorkoutSession {
  const nowMs = Date.now()
  return {
    workoutId: createClientId(nowMs),
    startedAt: new Date(nowMs).toISOString(),
    programId,
    day,
  }
}

function TodayContent({ today, onSelect }: { today: Today; onSelect: (day: TodayDay) => void }) {
  const emptyState = emptyStateOf(today)
  if (emptyState) return <p>{emptyState}</p>
  return (
    <LetterList days={today.days} suggestedLetter={today.suggestedLetter} onSelect={onSelect} />
  )
}

function LetterListSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-(--target-gap)">
      {['first', 'second', 'third'].map((row) => (
        <div
          key={row}
          className="min-h-(--target-workout) rounded-(--radius-capsule) bg-[color-mix(in_srgb,CanvasText_8%,transparent)]"
        />
      ))}
    </div>
  )
}
