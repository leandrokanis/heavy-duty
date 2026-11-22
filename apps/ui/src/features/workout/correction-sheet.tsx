'use client'

import { Button } from '@base-ui/react/button'
import { Drawer } from '@base-ui/react/drawer'
import { type RefObject, useState } from 'react'
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

const SECONDARY_BUTTON_CLASS =
  'min-h-(--target-workout) w-full rounded-(--radius-capsule) bg-[color-mix(in_srgb,CanvasText_12%,transparent)] px-(--space-24) text-[1.0625rem] font-(--font-weight-semibold) active:opacity-60'

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
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 bg-black/30" />
        <Drawer.Viewport className="fixed inset-x-0 bottom-0">
          <Drawer.Popup
            finalFocus={returnFocusRef}
            className="glass flex flex-col gap-(--space-24) rounded-t-[28px] px-(--space-margin-inline) pt-(--space-20) pb-[calc(var(--space-24)+env(safe-area-inset-bottom))]"
          >
            <CorrectionForm
              exerciseName={exerciseName}
              kind={kind}
              set={set}
              onCancel={onCancel}
              onSave={onSave}
            />
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
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
      <div className="flex flex-col gap-(--space-4)">
        <Drawer.Title className="text-[1.75rem] font-(--font-weight-semibold)">
          Corrigir última série
        </Drawer.Title>
        <p className="text-[1.0625rem] opacity-70">{`${exerciseName} · série ${set.setNumber}`}</p>
      </div>
      <ValueWheel
        field="loadG"
        label="Carga"
        value={loadG}
        onAdjust={(steps) => setLoadG((value) => adjustValue('loadG', value, steps))}
      />
      <ValueWheel
        field={kind === 'reps' ? 'reps' : 'seconds'}
        label={kind === 'reps' ? 'Repetições' : 'Tempo'}
        value={measure}
        onAdjust={(steps) =>
          setMeasure((value) => adjustValue(kind === 'reps' ? 'reps' : 'seconds', value, steps))
        }
      />
      <div className="flex flex-col gap-(--space-12)">
        <Button
          className="min-h-(--target-workout) w-full rounded-(--radius-capsule) bg-[CanvasText] px-(--space-24) text-[1.0625rem] font-(--font-weight-semibold) text-[Canvas] active:opacity-60"
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
        <Button className={SECONDARY_BUTTON_CLASS} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </>
  )
}
