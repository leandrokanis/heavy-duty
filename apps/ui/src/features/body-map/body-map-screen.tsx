'use client'

import { useCallback, useEffect, useState } from 'react'
import { TabBar } from '@/components/tab-bar'
import { goHome, OfflineNotice } from '@/features/auth/offline-notice'
import { SignInScreen } from '@/features/auth/sign-in-screen'
import type { CurrentPeriod } from '@/features/period/period.types'
import type { MuscleGroupLevels } from '@/features/workout/levels.types'
import type { Today } from '@/features/workout/today.types'
import { HATCH } from '@/features/workout/window-badge-list'
import type { ActivityWindows } from '@/features/workout/windows.types'
import { loadLevels } from '@/sync/levels-cache'
import { loadPeriod } from '@/sync/period-cache'
import { loadToday } from '@/sync/today-cache'
import { loadWindows } from '@/sync/windows-cache'
import { BodyFigure } from './body-figure'
import { bodyMapOf } from './body-map'
import { GroupList } from './group-list'
import { GroupSheet } from './group-sheet'

const CLOCK_TICK_MS = 60_000

type Copies = {
  windows: ActivityWindows | null
  levels: MuscleGroupLevels | null
  today: Today | null
  period: CurrentPeriod | null
}

type ScreenState =
  | { status: 'loading' }
  | { status: 'offline' }
  | { status: 'unauthenticated' }
  | ({ status: 'ok' } & Copies)

const PAGE_CLASS =
  'mx-auto flex flex-1 w-full max-w-[640px] flex-col px-(--space-margin-inline) pt-(--space-12)'

// The API answers or, without signal, the copies on the device answer (ADR-021); the map shows
// once the windows or the levels are known.
async function loadCopies(): Promise<ScreenState> {
  const [windows, levels, today, period] = await Promise.all([
    loadWindows(),
    loadLevels(),
    loadToday(),
    loadPeriod(),
  ])
  if ([windows, levels, today, period].some(({ status }) => status === 'unauthenticated')) {
    return { status: 'unauthenticated' }
  }
  if (windows.status !== 'ok' && levels.status !== 'ok') return { status: 'offline' }
  return {
    status: 'ok',
    windows: windows.status === 'ok' ? windows.windows : null,
    levels: levels.status === 'ok' ? levels.levels : null,
    today: today.status === 'ok' ? today.today : null,
    period: period.status === 'ok' ? period.period : null,
  }
}

const LEGEND = [
  { label: 'Janela aberta', background: 'var(--color-window-open)' },
  { label: 'Descansando', background: 'var(--color-window-rest)' },
  { label: 'Esfriando', background: HATCH },
] as const

export type BodyMapScreenProps = {
  // The device time zone when absent.
  timeZone?: string
}

export function BodyMapScreen({ timeZone }: BodyMapScreenProps = {}) {
  const [state, setState] = useState<ScreenState>({ status: 'loading' })
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

  const load = useCallback(() => {
    setState({ status: 'loading' })
    loadCopies().then((loaded) => {
      setState(loaded)
      setNowMs(Date.now())
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(timer)
  }, [])

  if (state.status === 'unauthenticated') return <SignInScreen onSignedIn={load} />
  if (state.status === 'offline') return <OfflineNotice onRetry={load} onHome={goHome} />

  const groups =
    state.status === 'ok' ? bodyMapOf(state.windows, state.levels, state.today, nowMs) : []
  const selected = groups.find(({ slug }) => slug === selectedSlug) ?? null
  const periodProgress =
    state.status === 'ok'
      ? (state.period?.groups.find(({ muscleGroup }) => muscleGroup.slug === selectedSlug) ?? null)
      : null

  return (
    <>
      <main aria-busy={state.status === 'loading' ? 'true' : undefined} className={PAGE_CLASS}>
        <h1 className="m-0 mt-(--space-8) font-(--font-weight-bold) text-(length:--font-size-large-title) leading-(--font-leading-tight) tracking-(--font-tracking-tight)">
          Mapa
        </h1>
        {state.status === 'ok' ? (
          <div className="mt-(--space-24) flex flex-col gap-(--space-16)">
            <div className="rounded-(--radius-card) bg-(--color-background-grouped) px-(--space-12) pt-(--space-16) pb-(--space-12)">
              <BodyFigure groups={groups} selectedSlug={selectedSlug} onSelect={setSelectedSlug} />
              <ul
                aria-label="Legenda"
                className="m-0 mt-(--space-8) flex list-none flex-wrap justify-center gap-x-(--space-16) gap-y-(--space-8) p-0 text-(--color-label-secondary) text-(length:--font-size-footnote)"
              >
                {LEGEND.map(({ label, background }) => (
                  <li key={label} className="flex items-center gap-(--space-8)">
                    <span
                      aria-hidden="true"
                      className="size-[10px] rounded-(--radius-circle)"
                      style={{ background }}
                    />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <GroupList
              groups={groups}
              nowMs={nowMs}
              timeZone={timeZone}
              onSelect={setSelectedSlug}
            />
          </div>
        ) : (
          <MapSkeleton />
        )}
        <GroupSheet
          group={selected}
          periodProgress={periodProgress}
          nowMs={nowMs}
          timeZone={timeZone}
          onClose={() => setSelectedSlug(null)}
        />
      </main>
      <TabBar current="map" />
    </>
  )
}

function MapSkeleton() {
  return (
    <div aria-hidden="true" className="mt-(--space-24) flex flex-col gap-(--space-16)">
      <span className="block h-[290px] rounded-(--radius-card) bg-(--color-background-grouped)" />
      <span className="block h-[192px] rounded-(--radius-card) bg-(--color-background-grouped)" />
    </div>
  )
}
