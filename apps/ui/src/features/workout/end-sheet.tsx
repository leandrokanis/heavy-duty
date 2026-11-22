'use client'

import type { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { ExerciseBar } from './exercise-bar'
import type { SequenceItem } from './workout-flow'

export type EndSheetProps = {
  open: boolean
  // The bar of the sheet draws one segment per exercise, from the same list as the sequence.
  items: SequenceItem[]
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
  items,
  doneSets,
  leftSets,
  returnFocusRef,
  onConfirm,
  onContinue,
}: EndSheetProps) {
  return (
    <Sheet.Root
      open={open}
      finalFocus={returnFocusRef}
      onOpenChange={(next) => {
        if (!next) onContinue()
      }}
    >
      <Sheet.Title>Encerrar o treino</Sheet.Title>
      <Sheet.Body>
        <div className="mt-(--space-8)">
          <ExerciseBar items={items} size="full" />
        </div>
        <div className="mt-(--space-8) flex flex-wrap justify-between gap-x-(--space-16) font-(--font-weight-bold) text-(length:--font-size-body) tabular-nums">
          <p className="m-0 text-(--color-label)">{doneLabel(doneSets)}</p>
          <p className="m-0 text-(--color-label-secondary)">{leftLabel(leftSets)}</p>
        </div>
      </Sheet.Body>
      <Sheet.Actions>
        <Button variant="secondary" size="workout" onClick={onContinue}>
          Continuar
        </Button>
        <Button size="workout" onClick={onConfirm}>
          Encerrar
        </Button>
      </Sheet.Actions>
    </Sheet.Root>
  )
}
