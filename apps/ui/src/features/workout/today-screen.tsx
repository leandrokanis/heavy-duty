'use client'

import { useCallback, useEffect, useState } from 'react'
import { OfflineNotice } from '@/features/auth/offline-notice'
import { SignInScreen } from '@/features/auth/sign-in-screen'
import { createClientId } from './client-id'
import { LetterList } from './letter-list'
import { StartSheet } from './start-sheet'
import type { Today, TodayDay } from './today.types'
import { fetchToday, type TodayResult } from './today-client'
import type { WorkoutSession } from './workout-flow'
import { WorkoutScreen } from './workout-screen'

const NO_PROGRAM = 'Nenhum programa cadastrado. Monte um programa pelo Claude.'
const NO_EXERCISES = 'O programa ativo não tem exercícios. Monte o programa pelo Claude.'

function emptyStateOf(today: Today): string | null {
  if (today.program === null) return NO_PROGRAM
  if (today.days.every((day) => day.exercises.length === 0)) return NO_EXERCISES
  return null
}

// The phase lives in memory only: a reload goes back to the letters (US-F03-03 keeps the workout).
export function TodayScreen() {
  const [result, setResult] = useState<TodayResult | null>(null)
  const [sheetDay, setSheetDay] = useState<TodayDay | null>(null)
  const [session, setSession] = useState<WorkoutSession | null>(null)

  const loadToday = useCallback(() => {
    setResult(null)
    fetchToday().then(setResult)
  }, [])

  useEffect(() => {
    loadToday()
  }, [loadToday])

  if (session) return <WorkoutScreen {...session} />
  if (result?.status === 'offline') return <OfflineNotice onRetry={loadToday} />
  if (result?.status === 'unauthenticated') return <SignInScreen onSignedIn={loadToday} />

  return (
    <main
      aria-busy={result === null ? 'true' : undefined}
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
      <StartSheet
        day={sheetDay}
        onClose={() => setSheetDay(null)}
        onStart={(day) => {
          setSheetDay(null)
          if (result?.status === 'ok' && result.today.program) {
            setSession(startSession(result.today.program.id, day))
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
