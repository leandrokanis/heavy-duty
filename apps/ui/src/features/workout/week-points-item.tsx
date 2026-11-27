import { Zap } from 'lucide-react'
import type { CurrentPeriod } from '@/features/period/period.types'

// The points of the workouts that started in the week of the period (D102).
export function WeekPointsItem({ points }: { points: number }) {
  return (
    <div
      role="img"
      aria-label={`${points} ${points === 1 ? 'ponto' : 'pontos'} na semana`}
      className="flex min-h-[44px] min-w-0 flex-col items-center gap-(--space-4) rounded-(--radius-card) bg-(--color-background-grouped) px-(--space-8) py-(--space-12) text-center text-(--color-label)"
    >
      <span aria-hidden="true" className="inline-flex size-8 items-center justify-center">
        <Zap size={24} strokeWidth={1.8} className="text-(--color-game-xp)" />
      </span>
      <span className="bg-linear-to-r from-(--color-game-xp) to-(--color-game-xp-2) bg-clip-text font-(--font-weight-bold) text-(length:--font-size-subheadline) text-transparent tabular-nums">
        {points}
      </span>
      <span className="font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-footnote)">
        semana
      </span>
    </div>
  )
}

// Only the week of now in the copy counts: with no signal, a copy of a past week shows nothing
// rather than old points, as the weekly goal does (D77).
export function weekPointsOf(period: CurrentPeriod | null, nowMs: number): number | null {
  const week = period?.weeks?.find(
    ({ from, to }) => Date.parse(from) <= nowMs && nowMs < Date.parse(to),
  )
  return week?.points ?? null
}
