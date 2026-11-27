import { Flame, Shield } from 'lucide-react'
import type { CurrentPeriod, WeekStreak } from '@/features/period/period.types'

export type StreakItemProps = { streak: WeekStreak }

const weeksWord = (weeks: number) => (weeks === 1 ? 'semana' : 'semanas')

// The weeks in a row with the weekly goal met (US-F11-03), with the shield while the protection of
// the period is still there (D101).
export function StreakItem({ streak }: StreakItemProps) {
  const { weeks, protectionUsed } = streak
  const label = `${weeks} ${weeksWord(weeks)} ${weeks === 1 ? 'seguida' : 'seguidas'} com a meta cumprida, ${protectionUsed ? 'proteção do período usada' : 'proteção do período disponível'}`
  return (
    <div
      role="img"
      aria-label={label}
      className="flex min-h-[44px] min-w-0 flex-col items-center gap-(--space-4) rounded-(--radius-card) bg-(--color-background-grouped) px-(--space-8) py-(--space-12) text-center text-(--color-label)"
    >
      <span aria-hidden="true" className="relative inline-flex size-8 items-center justify-center">
        <Flame size={26} strokeWidth={1.8} className="text-(--color-warning)" />
        {protectionUsed ? null : (
          <Shield
            size={13}
            strokeWidth={2.2}
            data-slot="streak-protection"
            className="absolute right-[-2px] bottom-0 fill-(--color-background-grouped) text-(--color-accent)"
          />
        )}
      </span>
      <span className="font-(--font-weight-bold) text-(length:--font-size-subheadline) tabular-nums">
        {weeks}
      </span>
      <span className="font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-footnote)">
        {weeksWord(weeks)}
      </span>
    </div>
  )
}

// Out of the strip with no streak and no goal this week: the streak cannot move (D76). A copy saved
// before the streak existed has neither field.
export function shownStreakOf(period: CurrentPeriod | null): WeekStreak | null {
  if (!period?.weekStreak) return null
  const goalThisWeek = period.weeks?.at(-1)?.weeklyGoal ?? null
  return period.weekStreak.weeks > 0 || goalThisWeek !== null ? period.weekStreak : null
}
