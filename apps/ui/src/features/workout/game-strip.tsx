'use client'

import { useState } from 'react'
import type { WeekStreak } from '@/features/period/period.types'
import type { OverallLevelView } from './overall-level'
import { OverallLevelButton, restingLineOf } from './overall-level-button'
import { StreakItem } from './streak-item'
import type { TodayDay } from './today.types'
import { WeekPointsItem } from './week-points-item'
import { WeeklyGoalItem } from './weekly-goal-item'
import type { WeekWindows } from './weekly-windows.types'

export type GameStripProps = {
  overallLevel: OverallLevelView | null
  week: WeekWindows | null
  // Null when the strip leaves the streak out (shownStreakOf).
  streak?: WeekStreak | null
  // Null with no points known for the week of now (weekPointsOf).
  weekPoints?: number | null
  nowMs: number
  timeZone?: string
  onSelectDay: (day: TodayDay) => void
}

// The game strip on top of the workout of the day: the overall level, the streak of weeks, the
// weekly goal and the points of the week (D78, D102), each shown only when known; with no goal set, the goal stays out (D76). With the group that
// limits resting, a tap tells when its window opens, with no sheet; the live region stays in the
// tree while empty, so the line is announced when it shows.
export function GameStrip({
  overallLevel,
  week,
  streak = null,
  weekPoints = null,
  nowMs,
  timeZone,
  onSelectDay,
}: GameStripProps) {
  const [restingShown, setRestingShown] = useState(false)
  const weeklyGoal = week?.weeklyGoal ?? null
  if (overallLevel === null && weeklyGoal === null && streak === null && weekPoints === null) {
    return null
  }
  const restingLine =
    restingShown && overallLevel ? restingLineOf(overallLevel, nowMs, timeZone) : ''
  return (
    <section aria-label="Faixa de jogo" className="flex flex-col">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-(--space-8)">
        {overallLevel && (
          <OverallLevelButton
            view={overallLevel}
            nowMs={nowMs}
            timeZone={timeZone}
            onPress={() => {
              const { target } = overallLevel
              setRestingShown(target.kind === 'resting')
              if (target.kind === 'letter') onSelectDay(target.day)
            }}
          />
        )}
        {streak && <StreakItem streak={streak} />}
        {week && weeklyGoal !== null && (
          <WeeklyGoalItem weeklyGoal={weeklyGoal} windowsUsed={week.windowsUsed} />
        )}
        {weekPoints !== null && <WeekPointsItem points={weekPoints} />}
      </div>
      <p
        role="status"
        className="m-0 mt-(--space-8) text-(--color-label-secondary) text-(length:--font-size-footnote) empty:mt-0"
      >
        {restingLine}
      </p>
    </section>
  )
}
