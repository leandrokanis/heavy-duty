'use client'

import { PencilLine } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { TabBar } from '@/components/tab-bar'
import { Button } from '@/components/ui/button'
import { goHome, OfflineNotice } from '@/features/auth/offline-notice'
import { SignInScreen } from '@/features/auth/sign-in-screen'
import { capitalized } from '@/features/body-map/group-parts'
import { LevelBadge } from '@/features/workout/level-badge'
import type { MuscleGroupLevels } from '@/features/workout/levels.types'
import { loadLevels } from '@/sync/levels-cache'
import { loadPeriod, storePeriod } from '@/sync/period-cache'
import { IntentionSheet } from './intention-sheet'
import type { CurrentPeriod } from './period.types'
import { formatPeriodDays, weekOfPeriod } from './period-format'
import { RankingList } from './ranking-list'

const CLOCK_TICK_MS = 60_000
const RING_RADIUS = 42
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

const PAGE_CLASS =
  'mx-auto flex flex-1 w-full max-w-[640px] flex-col px-(--space-margin-inline) pt-(--space-12)'
const SECTION_TITLE_CLASS =
  'm-0 mt-(--space-24) mb-(--space-8) px-(--space-4) font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-footnote) uppercase tracking-[0.04em]'
const CARD_CLASS = 'rounded-(--radius-card) bg-(--color-background-grouped)'

type ScreenState =
  | { status: 'loading' }
  | { status: 'offline' }
  | { status: 'unauthenticated' }
  | { status: 'ok'; period: CurrentPeriod; levels: MuscleGroupLevels | null }

async function loadCopies(): Promise<ScreenState> {
  const [period, levels] = await Promise.all([loadPeriod(), loadLevels()])
  if (period.status === 'unauthenticated' || levels.status === 'unauthenticated') {
    return { status: 'unauthenticated' }
  }
  if (period.status !== 'ok') return { status: 'offline' }
  return {
    status: 'ok',
    period: period.period,
    levels: levels.status === 'ok' ? levels.levels : null,
  }
}

export type PeriodScreenProps = {
  // The device time zone when absent.
  timeZone?: string
}

// The period of 12 weeks (US-F11-01): the API answers or, with no signal, the copy on the device.
export function PeriodScreen({ timeZone }: PeriodScreenProps = {}) {
  const [state, setState] = useState<ScreenState>({ status: 'loading' })
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [editing, setEditing] = useState(false)

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

  return (
    <>
      <main aria-busy={state.status === 'loading' ? 'true' : undefined} className={PAGE_CLASS}>
        <h1 className="m-0 mt-(--space-8) font-(--font-weight-bold) text-(length:--font-size-large-title) leading-(--font-leading-tight) tracking-(--font-tracking-tight)">
          Período
        </h1>
        {state.status === 'ok' ? (
          <>
            <PeriodContent
              period={state.period}
              levels={state.levels}
              nowMs={nowMs}
              timeZone={timeZone}
              onEdit={() => setEditing(true)}
            />
            <IntentionSheet
              open={editing}
              intention={state.period.intention}
              onClose={() => setEditing(false)}
              onSaved={(period) => {
                setEditing(false)
                void storePeriod(period)
                setState({ ...state, period })
              }}
            />
          </>
        ) : (
          <PeriodSkeleton />
        )}
      </main>
      <TabBar current="period" />
    </>
  )
}

type PeriodContentProps = {
  period: CurrentPeriod
  levels: MuscleGroupLevels | null
  nowMs: number
  timeZone?: string
  onEdit: () => void
}

function PeriodContent({ period, levels, nowMs, timeZone, onEdit }: PeriodContentProps) {
  const week = weekOfPeriod(period.startsAt, period.weekCount, nowMs)
  return (
    <>
      <p className="m-0 mt-(--space-4) text-(--color-label-secondary) text-(length:--font-size-callout)">
        {`Período ${period.number} · ${period.weekCount} semanas`}
      </p>
      <section
        aria-label="Semana do período"
        className={`${CARD_CLASS} mt-(--space-16) flex items-center gap-(--space-16) p-(--space-16)`}
      >
        <svg aria-hidden="true" viewBox="0 0 100 100" className="size-[88px] shrink-0 -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="10"
            className="stroke-(--color-fill-strong)"
          />
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - week / period.weekCount)}
            className="stroke-(--color-accent)"
          />
        </svg>
        <div className="flex min-w-0 flex-col gap-(--space-4)">
          <p className="m-0 font-(--font-weight-bold) text-(length:--font-size-title-2) tabular-nums">
            {`Semana ${week} de ${period.weekCount}`}
          </p>
          <p className="m-0 text-(--color-label-secondary) text-(length:--font-size-footnote)">
            {formatPeriodDays(period.startsAt, period.endsAt, timeZone)}
          </p>
          {period.intention ? (
            <p className="m-0 mt-(--space-4) font-(--font-weight-semibold)">
              {`“${period.intention}”`}
            </p>
          ) : (
            <p className="m-0 mt-(--space-4) text-(--color-label-secondary)">
              Sem frase de intenção
            </p>
          )}
          <Button
            variant="secondary"
            icon={PencilLine}
            className="mt-(--space-8) self-start px-(--space-16)"
            onClick={onEdit}
          >
            {period.intention ? 'Editar a frase' : 'Escrever a frase'}
          </Button>
        </div>
      </section>
      <h2 className={SECTION_TITLE_CLASS}>Metas do período</h2>
      <div className={`${CARD_CLASS} flex flex-col px-(--space-16) py-(--space-8)`}>
        <Indicator
          label="Janelas aproveitadas"
          value={period.windows.usedPercent}
          target={period.windows.targetPercent}
          empty="Nenhuma janela terminou no período"
        />
        <Indicator
          label="Volume semanal"
          value={period.volume.changePercent}
          target={period.volume.targetPercent}
          signed
          empty={
            period.volume.baselineVolumeG === null
              ? 'Aparece no fim da semana 1'
              : 'Sem volume na semana 1 para comparar'
          }
        />
      </div>
      {levels && levels.groups.length > 0 ? (
        <>
          <h2 className={SECTION_TITLE_CLASS}>Níveis</h2>
          <ul
            aria-label="Níveis"
            className={`${CARD_CLASS} m-0 grid list-none grid-cols-3 gap-(--space-12) p-(--space-16) sm:grid-cols-4`}
          >
            {levels.groups.map(({ muscleGroup, level, tier, cooling }) => (
              <li
                key={muscleGroup.slug}
                className="flex flex-col items-center gap-(--space-4) text-center text-(length:--font-size-footnote)"
              >
                <LevelBadge level={level} tier={tier} size={40} cold={cooling === true} />
                <span>
                  {capitalized(muscleGroup.name)}
                  <span className="sr-only">{`, nível ${level}`}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h2 className={SECTION_TITLE_CLASS}>Ranking dos seus treinos</h2>
      <RankingList ranking={period.ranking ?? []} timeZone={timeZone} />
    </>
  )
}

type IndicatorProps = {
  label: string
  value: number | null
  target: number
  signed?: boolean
  empty: string
}

const percentOf = (value: number, signed: boolean) =>
  `${signed && value > 0 ? '+' : ''}${value} %`.replace('-', '−')

// One goal of the period against its target (O1 and O4 of the PRD), with the bar full at the target.
function Indicator({ label, value, target, signed = false, empty }: IndicatorProps) {
  const filled = value === null ? 0 : Math.min(1, Math.max(0, value / target))
  return (
    <div className="flex flex-col gap-(--space-4) border-(--color-separator) border-b py-(--space-8) last:border-b-0">
      <p className="m-0 flex items-baseline justify-between gap-(--space-12)">
        <span>{label}</span>
        <span className="font-(--font-weight-bold) text-(length:--font-size-title-2) tabular-nums">
          {value === null ? '—' : percentOf(value, signed)}
        </span>
      </p>
      <span
        aria-hidden="true"
        className="block h-2 overflow-hidden rounded-(--radius-capsule) bg-(--color-fill-strong)"
      >
        <span
          className="block h-full rounded-(--radius-capsule) bg-(--color-accent)"
          style={{ width: `${filled * 100}%` }}
        />
      </span>
      <span className="text-(--color-label-secondary) text-(length:--font-size-footnote)">
        {`Meta do período: ${percentOf(target, signed)}`}
        {value === null ? `. ${empty}.` : ''}
      </span>
    </div>
  )
}

function PeriodSkeleton() {
  return (
    <div aria-hidden="true" className="mt-(--space-24) flex flex-col gap-(--space-16)">
      <span className={`${CARD_CLASS} block h-[160px]`} />
      <span className={`${CARD_CLASS} block h-[180px]`} />
    </div>
  )
}
