'use client'

import { Button } from '@base-ui/react/button'
import { Drawer } from '@base-ui/react/drawer'
import type { RefObject } from 'react'

export type EndSheetProps = {
  open: boolean
  doneSets: number
  leftSets: number
  // Where the focus goes when the sheet closes: the control that opened the sequence.
  returnFocusRef: RefObject<HTMLElement | null>
  onConfirm: () => void
  onContinue: () => void
}

function doneLabel(count: number): string {
  return count === 1 ? '1 série feita' : `${count} séries feitas`
}

function leftLabel(count: number): string {
  return count === 1 ? '1 série que falta' : `${count} séries que faltam`
}

export function EndSheet({
  open,
  doneSets,
  leftSets,
  returnFocusRef,
  onConfirm,
  onContinue,
}: EndSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onContinue()
      }}
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 bg-black/30" />
        <Drawer.Viewport className="fixed inset-x-0 bottom-0">
          <Drawer.Popup
            finalFocus={returnFocusRef}
            className="glass flex flex-col gap-(--space-24) rounded-t-[28px] px-(--space-margin-inline) pt-(--space-20) pb-[calc(var(--space-24)+env(safe-area-inset-bottom))]"
          >
            <Drawer.Title className="text-[1.75rem] font-(--font-weight-semibold)">
              Encerrar o treino
            </Drawer.Title>
            <div className="flex flex-col gap-(--space-8) text-[1.25rem] tabular-nums">
              <p>{doneLabel(doneSets)}</p>
              <p className="opacity-70">{leftLabel(leftSets)}</p>
            </div>
            <div className="flex flex-col gap-(--space-12)">
              <Button
                className="min-h-(--target-workout) w-full rounded-(--radius-capsule) bg-[CanvasText] px-(--space-24) text-[1.0625rem] font-(--font-weight-semibold) text-[Canvas] active:opacity-60"
                onClick={onConfirm}
              >
                Encerrar
              </Button>
              <Button
                className="min-h-(--target-workout) w-full rounded-(--radius-capsule) bg-[color-mix(in_srgb,CanvasText_12%,transparent)] px-(--space-24) text-[1.0625rem] font-(--font-weight-semibold) active:opacity-60"
                onClick={onContinue}
              >
                Continuar
              </Button>
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
