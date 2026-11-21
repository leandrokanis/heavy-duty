'use client'

import { Button } from '@base-ui/react/button'
import { Drawer } from '@base-ui/react/drawer'
import { Timer, X } from 'lucide-react'
import { formatDurationMinutes } from './format'
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
    <Drawer.Root
      open={day !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 bg-black/30" />
        <Drawer.Viewport className="fixed inset-x-0 bottom-0">
          <Drawer.Popup className="glass flex flex-col gap-(--space-24) rounded-t-[28px] px-(--space-margin-inline) pt-(--space-20) pb-[calc(var(--space-24)+env(safe-area-inset-bottom))]">
            {day ? (
              <>
                <div className="flex items-center justify-between gap-(--space-16)">
                  <Drawer.Title className="text-[1.75rem] font-(--font-weight-semibold)">
                    {day.letter} {day.label}
                  </Drawer.Title>
                  <Drawer.Close
                    aria-label="Fechar"
                    className="flex size-(--target-workout) shrink-0 items-center justify-center rounded-(--radius-circle) bg-[color-mix(in_srgb,CanvasText_12%,transparent)] active:opacity-60"
                  >
                    <X aria-hidden="true" size={24} />
                  </Drawer.Close>
                </div>
                <ul className="flex flex-col gap-(--space-12)">
                  {day.exercises.map((planned) => (
                    <li
                      key={planned.exercise.id}
                      className="flex items-baseline justify-between gap-(--space-16)"
                    >
                      <span>{planned.exercise.name}</span>
                      <span className="tabular-nums opacity-70">{setsLabel(planned.sets)}</span>
                    </li>
                  ))}
                </ul>
                <p className="flex items-center gap-(--space-8) tabular-nums opacity-70">
                  <Timer aria-hidden="true" size={20} />
                  <span>{formatDurationMinutes(day.estimatedDurationSeconds)}</span>
                </p>
                <Button
                  className="min-h-(--target-workout) w-full rounded-(--radius-capsule) bg-[CanvasText] px-(--space-24) text-[1.0625rem] font-(--font-weight-semibold) text-[Canvas] active:opacity-60"
                  onClick={() => onStart(day)}
                >
                  Começar
                </Button>
              </>
            ) : null}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
