'use client'

import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { formatDurationMinutes } from './format'
import { LetterBadge } from './letter-badge'
import type { TodayDay } from './today.types'

export type StartSheetProps = {
  day: TodayDay | null
  onClose: () => void
  onStart: (day: TodayDay) => void
}

function setsLabel(sets: number): string {
  return sets === 1 ? '1 série' : `${sets} séries`
}

export function StartSheet({ day, onClose, onStart }: StartSheetProps) {
  return (
    <Sheet.Root
      open={day !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {day ? (
        <>
          <div className="flex items-center gap-(--space-16)">
            <span aria-hidden="true" className="flex">
              <LetterBadge letter={day.letter} size={44} />
            </span>
            <div className="flex min-w-0 flex-col">
              <Sheet.Title>
                {day.label ? (
                  <>
                    <span className="sr-only">{day.letter}</span> {day.label}
                  </>
                ) : (
                  day.letter
                )}
              </Sheet.Title>
              <p className="m-0 flex items-center gap-(--space-4) font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-callout) tabular-nums">
                <Clock aria-hidden="true" size={15} />
                <span>{formatDurationMinutes(day.estimatedDurationSeconds)}</span>
              </p>
            </div>
          </div>
          <Sheet.Body>
            <ul className="m-0 mt-(--space-12) flex list-none flex-col p-0">
              {day.exercises.map((planned) => (
                <li
                  key={planned.exercise.id}
                  className="flex items-baseline justify-between gap-(--space-16) border-(--color-separator) border-t py-(--space-12)"
                >
                  <span className="text-(--color-label)">{planned.exercise.name}</span>
                  <span className="text-(--color-label-secondary) tabular-nums">
                    {setsLabel(planned.sets)}
                  </span>
                </li>
              ))}
            </ul>
          </Sheet.Body>
          <Sheet.Actions>
            <Button variant="secondary" size="workout" onClick={onClose}>
              Fechar
            </Button>
            <Button size="workout" onClick={() => onStart(day)}>
              Começar
            </Button>
          </Sheet.Actions>
        </>
      ) : null}
    </Sheet.Root>
  )
}
