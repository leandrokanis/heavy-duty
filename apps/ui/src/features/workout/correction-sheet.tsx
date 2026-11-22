'use client'

import { type RefObject, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { adjustValue } from './drag-adjust'
import type { ExerciseKind } from './today.types'
import { ValueWheel } from './value-wheel'
import type { SetValues } from './workout-flow'
import type { RecordWorkoutSetBody } from './workout-set.types'

export type CorrectionSheetProps = {
  open: boolean
  exerciseName: string
  kind: ExerciseKind
  set: Pick<RecordWorkoutSetBody, 'setNumber' | 'loadG' | 'reps' | 'seconds'>
  // Where the focus goes when the sheet closes: the button that opened it.
  returnFocusRef: RefObject<HTMLElement | null>
  onCancel: () => void
  onSave: (values: SetValues) => void
}

export function CorrectionSheet({
  open,
  exerciseName,
  kind,
  set,
  returnFocusRef,
  onCancel,
  onSave,
}: CorrectionSheetProps) {
  return (
    <Sheet.Root
      open={open}
      finalFocus={returnFocusRef}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <CorrectionForm
        exerciseName={exerciseName}
        kind={kind}
        set={set}
        onCancel={onCancel}
        onSave={onSave}
      />
    </Sheet.Root>
  )
}

// Mounted with the popup, so each opening starts from the recorded values and a cancel leaves no draft.
function CorrectionForm({
  exerciseName,
  kind,
  set,
  onCancel,
  onSave,
}: Pick<CorrectionSheetProps, 'exerciseName' | 'kind' | 'set' | 'onCancel' | 'onSave'>) {
  const [loadG, setLoadG] = useState(set.loadG)
  const [measure, setMeasure] = useState((kind === 'reps' ? set.reps : set.seconds) as number)
  return (
    <>
      <Sheet.Title>Corrigir última série</Sheet.Title>
      <p className="m-0 mt-(--space-4) text-(--color-label-secondary) text-(length:--font-size-callout)">{`${exerciseName} · série ${set.setNumber}`}</p>
      <Sheet.Body>
        <div className="mt-(--space-16) flex flex-col gap-(--space-12)">
          <ValueWheel
            field="loadG"
            label="Carga"
            surface="fill"
            value={loadG}
            onAdjust={(steps) => setLoadG((value) => adjustValue('loadG', value, steps))}
          />
          <ValueWheel
            field={kind === 'reps' ? 'reps' : 'seconds'}
            label={kind === 'reps' ? 'Repetições' : 'Tempo'}
            surface="fill"
            value={measure}
            onAdjust={(steps) =>
              setMeasure((value) => adjustValue(kind === 'reps' ? 'reps' : 'seconds', value, steps))
            }
          />
        </div>
      </Sheet.Body>
      <Sheet.Actions>
        <Button variant="secondary" size="workout" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          size="workout"
          onClick={() =>
            onSave({
              loadG,
              reps: kind === 'reps' ? measure : null,
              seconds: kind === 'time' ? measure : null,
            })
          }
        >
          Salvar
        </Button>
      </Sheet.Actions>
    </>
  )
}
