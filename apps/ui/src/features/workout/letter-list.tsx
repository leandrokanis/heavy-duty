'use client'

import { Button } from '@base-ui/react/button'
import type { TodayDay } from './today.types'

export type LetterListProps = {
  days: TodayDay[]
  suggestedLetter: string | null
  onSelect: (day: TodayDay) => void
}

export function LetterList({ days, suggestedLetter, onSelect }: LetterListProps) {
  return (
    <ul className="flex flex-col gap-(--target-gap)">
      {days.map((day) => {
        const empty = day.exercises.length === 0
        const suggested = day.letter === suggestedLetter
        return (
          <li key={day.letter}>
            <Button
              className={`flex min-h-(--target-workout) w-full items-center gap-(--space-16) rounded-(--radius-capsule) px-(--space-20) text-left active:opacity-60 data-disabled:opacity-40 ${
                suggested ? 'bg-[CanvasText] text-[Canvas]' : 'border border-current'
              }`}
              disabled={empty}
              focusableWhenDisabled
              onClick={() => onSelect(day)}
            >
              <span className="text-[1.75rem] font-(--font-weight-semibold) tabular-nums">
                {day.letter}
              </span>
              <span className="flex-1">{day.label}</span>
              {suggested ? (
                <span className="text-[0.8125rem] font-(--font-weight-semibold)">Sugerida</span>
              ) : null}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
