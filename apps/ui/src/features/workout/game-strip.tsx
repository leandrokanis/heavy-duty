'use client'

import { useState } from 'react'
import type { OverallLevelView } from './overall-level'
import { OverallLevelButton, restingLineOf } from './overall-level-button'
import type { TodayDay } from './today.types'
import { WeeklyGoalItem } from './weekly-goal-item'
import type { WeekWindows } from './weekly-windows.types'

export type GameStripProps = {
  overallLevel: OverallLevelView | null
  week: WeekWindows | null
  nowMs: number
  timeZone?: string
  onSelectDay: (day: TodayDay) => void
}

// The game strip on top of the workout of the day: the overall level and the weekly goal (D78),
// each shown only when known; with no goal set, the goal stays out (D76). With the group that
// limits resting, a tap tells when its window opens, with no sheet; the live region stays in the
// tree while empty, so the line is announced when it shows.
export function GameStrip({ overallLevel, week, nowMs, timeZone, onSelectDay }: GameStripProps) {
  const [restingShown, setRestingShown] = useState(false)
  const weeklyGoal = week?.weeklyGoal ?? null
  if (overallLevel === null && weeklyGoal === null) return null
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
        {week && weeklyGoal !== null && (
          <WeeklyGoalItem weeklyGoal={weeklyGoal} windowsUsed={week.windowsUsed} />
        )}
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
