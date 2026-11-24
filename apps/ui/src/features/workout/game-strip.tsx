'use client'

import { useState } from 'react'
import type { OverallLevelView } from './overall-level'
import { OverallLevelButton, restingLineOf } from './overall-level-button'
import type { TodayDay } from './today.types'

export type GameStripProps = {
  overallLevel: OverallLevelView | null
  nowMs: number
  timeZone?: string
  onSelectDay: (day: TodayDay) => void
}

// The game strip on top of the workout of the day: the overall level now, the weekly goal later
// (D78). With the group that limits resting, a tap tells when its window opens, with no sheet;
// the live region stays in the tree while empty, so the line is announced when it shows.
export function GameStrip({ overallLevel, nowMs, timeZone, onSelectDay }: GameStripProps) {
  const [restingShown, setRestingShown] = useState(false)
  if (overallLevel === null) return null
  const restingLine = restingShown ? restingLineOf(overallLevel, nowMs, timeZone) : ''
  return (
    <section aria-label="Faixa de jogo" className="flex flex-col">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-(--space-8)">
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
