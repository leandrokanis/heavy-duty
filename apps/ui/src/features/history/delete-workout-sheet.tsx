'use client'

import type { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'

export type DeleteWorkoutSheetProps = {
  open: boolean
  // The letter and the date of the workout, as the detail shows them.
  title: string
  setCount: number
  // True while the removal is on its way; Apagar waits for the answer.
  busy: boolean
  // True after a removal that did not reach the API.
  failed: boolean
  returnFocusRef: RefObject<HTMLElement | null>
  onConfirm: () => void
  onCancel: () => void
}

function setsLabel(count: number): string {
  if (count === 0) return 'Nenhuma série registrada'
  return count === 1 ? '1 série sai do histórico' : `${count} séries saem do histórico`
}

// The removal asks for an explicit confirmation (US-F20-02), as an alertdialog: it removes data.
export function DeleteWorkoutSheet({
  open,
  title,
  setCount,
  busy,
  failed,
  returnFocusRef,
  onConfirm,
  onCancel,
}: DeleteWorkoutSheetProps) {
  return (
    <Sheet.Root
      open={open}
      role="alertdialog"
      finalFocus={returnFocusRef}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <Sheet.Title>Apagar treino</Sheet.Title>
      <Sheet.Body>
        <p className="m-0 mt-(--space-8) font-(--font-weight-bold) text-(--color-label) text-(length:--font-size-body)">
          {title}
        </p>
        <p className="m-0 mt-(--space-4) text-(--color-label-secondary) text-(length:--font-size-body) tabular-nums">
          {setsLabel(setCount)}
        </p>
        {failed ? (
          <p
            role="alert"
            className="m-0 mt-(--space-12) text-(--color-danger) text-(length:--font-size-subheadline)"
          >
            Sem conexão. Tente de novo.
          </p>
        ) : null}
      </Sheet.Body>
      <Sheet.Actions>
        <Button variant="secondary" size="large" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="destructive"
          size="large"
          disabled={busy}
          focusableWhenDisabled
          aria-busy={busy ? 'true' : undefined}
          onClick={onConfirm}
        >
          Apagar
        </Button>
      </Sheet.Actions>
    </Sheet.Root>
  )
}
