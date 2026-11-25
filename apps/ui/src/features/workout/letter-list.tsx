'use client'

import { ChevronRight } from 'lucide-react'
import { MotionButton } from '@/components/ui/motion-button'
import { muscleGroupsOfDay } from '@/shared/muscle-groups-of-day'
import { LetterBadge } from './letter-badge'
import type { MuscleGroupLevels } from './levels.types'
import type { TodayDay } from './today.types'
import { WindowBadgeList } from './window-badge-list'
import { windowBadgesOf } from './window-badges'
import type { ActivityWindows } from './windows.types'

export type LetterListProps = {
  days: TodayDay[]
  suggestedLetter: string | null
  onSelect: (day: TodayDay) => void
  windows: ActivityWindows | null
  levels?: MuscleGroupLevels | null
  nowMs: number
  timeZone?: string
}

// The divider starts where the name starts: row padding (16) + badge (44) + gap (16).
const DIVIDER_LEFT = 'left-[76px]'

export function LetterList({
  days,
  suggestedLetter,
  onSelect,
  windows,
  levels,
  nowMs,
  timeZone,
}: LetterListProps) {
  return (
    <ul className="m-0 flex list-none flex-col overflow-hidden rounded-(--radius-card) bg-(--color-background-grouped) p-0">
      {days.map((day, index) => {
        const empty = day.exercises.length === 0
        const suggested = day.letter === suggestedLetter
        const badges = windows ? windowBadgesOf(muscleGroupsOfDay(day), windows, nowMs) : []
        return (
          <li key={day.letter} className="relative">
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={`absolute top-0 right-0 h-px bg-(--color-separator) ${DIVIDER_LEFT}`}
              />
            ) : null}
            <MotionButton
              tapScale={1}
              className="flex min-h-[72px] w-full cursor-pointer select-none items-center gap-(--space-16) px-(--space-16) py-(--space-12) text-left text-(--color-label) transition-colors duration-(--duration-fast) data-disabled:opacity-45 data-pressed:bg-(--color-fill)"
              disabled={empty}
              focusableWhenDisabled
              onClick={() => onSelect(day)}
            >
              <LetterBadge letter={day.letter} size={44} suggested={suggested} />
              <span className="flex min-w-0 flex-1 flex-col gap-(--space-4)">
                <span className="truncate font-(--font-weight-semibold) text-(length:--font-size-headline)">
                  {day.label}
                </span>
                <WindowBadgeList
                  badges={badges}
                  levels={levels}
                  nowMs={nowMs}
                  timeZone={timeZone}
                />
              </span>
              {suggested ? (
                <span className="rounded-(--radius-capsule) bg-(--color-fill) px-(--space-12) py-(--space-4) font-(--font-weight-semibold) text-(length:--font-size-footnote)">
                  Sugerida
                </span>
              ) : null}
              <ChevronRight
                aria-hidden="true"
                size={22}
                className="shrink-0 text-(--color-label-secondary)"
              />
            </MotionButton>
          </li>
        )
      })}
    </ul>
  )
}
