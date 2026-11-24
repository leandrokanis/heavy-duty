'use client'

import type { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'

export type DiscardSheetProps = {
  open: boolean
  doneSets: number
  // Where the focus goes when the sheet closes: the control that opened the sequence.
  returnFocusRef: RefObject<HTMLElement | null>
  onConfirm: () => void
  onContinue: () => void
}

function leavingLabel(count: number): string {
  if (count === 0) return 'Nenhuma série feita'
  return count === 1 ? '1 série feita sai do histórico' : `${count} séries feitas saem do histórico`
}

// The discard asks for its own confirmation, with the sets that leave (D25, ADR-032).
export function DiscardSheet({
  open,
  doneSets,
  returnFocusRef,
  onConfirm,
  onContinue,
}: DiscardSheetProps) {
  return (
    <Sheet.Root
      open={open}
      finalFocus={returnFocusRef}
      onOpenChange={(next) => {
        if (!next) onContinue()
      }}
    >
      <Sheet.Title>Descartar o treino</Sheet.Title>
      <Sheet.Body>
        <p className="m-0 mt-(--space-8) font-(--font-weight-bold) text-(--color-label) text-(length:--font-size-body) tabular-nums">
          {leavingLabel(doneSets)}
        </p>
      </Sheet.Body>
      <Sheet.Actions>
        <Button variant="secondary" size="workout" onClick={onContinue}>
          Continuar
        </Button>
        <Button variant="destructive" size="workout" onClick={onConfirm}>
          Descartar
        </Button>
      </Sheet.Actions>
    </Sheet.Root>
  )
}
