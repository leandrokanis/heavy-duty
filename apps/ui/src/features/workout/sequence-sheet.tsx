'use client'

import { Button } from '@base-ui/react/button'
import { Drawer } from '@base-ui/react/drawer'
import { Check, Circle, CircleDot, SkipForward, X } from 'lucide-react'
import type { RefObject } from 'react'
import { formatLoadKg } from './format'
import type { RecordedSetView, SequenceItem } from './workout-flow'

export type SequenceSheetProps = {
  open: boolean
  items: SequenceItem[]
  // A finished workout lists everything done, with no way to another exercise or to end it.
  finished: boolean
  // True while another exercise is left to do; without it the current row has no Pular (FR-002).
  canSkip: boolean
  // Where the focus goes when the sheet closes: the control that opened it.
  returnFocusRef: RefObject<HTMLElement | null>
  onClose: () => void
  onPick: (exerciseIndex: number) => void
  onSkip: () => void
  onEnd: () => void
}

const STATUS_LABEL = {
  done: 'Feito',
  current: 'Atual',
  skipped: 'Pulado',
  todo: 'Por fazer',
} as const

const STATUS_ICON = {
  done: Check,
  current: CircleDot,
  skipped: SkipForward,
  todo: Circle,
} as const

const ROW_CLASS =
  'flex min-h-(--target-workout) w-full items-center gap-(--space-16) rounded-(--radius-capsule) px-(--space-20) text-left'

function ItemContent({ item }: { item: SequenceItem }) {
  const Icon = STATUS_ICON[item.status]
  return (
    <>
      <Icon aria-hidden="true" size={24} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-[1.0625rem] font-(--font-weight-semibold)">
        {item.name}
      </span>
      <span className="opacity-70">{STATUS_LABEL[item.status]}</span>
      <span className="tabular-nums opacity-70">{`${item.setsDone} de ${item.setsTotal}`}</span>
    </>
  )
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

// The same set twice: the figures for the eye, the full sentence for the screen reader (FR-010).
function RecordedSetRow({ set }: { set: RecordedSetView }) {
  const isTime = typeof set.seconds === 'number'
  const amount = isTime ? (set.seconds as number) : (set.reps ?? 0)
  const spoken = isTime
    ? plural(amount, 'segundo', 'segundos')
    : plural(amount, 'repetição', 'repetições')
  return (
    <li className="flex flex-wrap items-baseline gap-x-(--space-16)">
      <span aria-hidden="true" className="flex flex-wrap items-baseline gap-x-(--space-16)">
        <span className="opacity-70">{`Série ${set.setNumber}`}</span>
        <span>
          <span className="tabular-nums">{formatLoadKg(set.loadG)}</span>
          <span className="text-[0.8125rem] font-normal opacity-70"> kg</span>
        </span>
        <span>
          <span className="tabular-nums">{amount}</span>
          <span className="text-[0.8125rem] font-normal opacity-70">{isTime ? ' s' : ' rep'}</span>
        </span>
      </span>
      <span className="sr-only">{`Série ${set.setNumber}: ${formatLoadKg(set.loadG)} kg, ${spoken}`}</span>
    </li>
  )
}

export function SequenceSheet({
  open,
  items,
  finished,
  canSkip,
  returnFocusRef,
  onClose,
  onPick,
  onSkip,
  onEnd,
}: SequenceSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 bg-black/30" />
        <Drawer.Viewport className="fixed inset-x-0 bottom-0">
          <Drawer.Popup
            finalFocus={returnFocusRef}
            className="glass flex max-h-[calc(100dvh-env(safe-area-inset-top)-var(--space-16))] flex-col gap-(--space-24) rounded-t-[28px] px-(--space-margin-inline) pt-(--space-20) pb-[calc(var(--space-24)+env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between gap-(--space-16)">
              <Drawer.Title className="text-[1.75rem] font-(--font-weight-semibold)">
                Sequência do treino
              </Drawer.Title>
              <Drawer.Close
                aria-label="Fechar"
                className="flex size-(--target-workout) shrink-0 items-center justify-center rounded-(--radius-circle) bg-[color-mix(in_srgb,CanvasText_12%,transparent)] active:opacity-60"
              >
                <X aria-hidden="true" size={24} />
              </Drawer.Close>
            </div>
            <ul
              aria-label="Exercícios"
              className="flex min-h-0 flex-1 flex-col gap-(--space-8) overflow-y-auto overscroll-contain"
            >
              {items.map((item) => (
                <li key={item.exerciseIndex}>
                  {(item.status === 'todo' || item.status === 'skipped') && !finished ? (
                    <Button
                      className={`${ROW_CLASS} bg-[color-mix(in_srgb,CanvasText_8%,transparent)] active:opacity-60`}
                      onClick={() => onPick(item.exerciseIndex)}
                    >
                      <ItemContent item={item} />
                    </Button>
                  ) : (
                    <div className="flex items-center gap-(--space-8)">
                      <div className={`${ROW_CLASS} min-w-0 flex-1`}>
                        <ItemContent item={item} />
                      </div>
                      {item.status === 'current' && canSkip && !finished ? (
                        <Button
                          aria-label={`Pular ${item.name}`}
                          className="min-h-(--target-workout) shrink-0 rounded-(--radius-capsule) bg-[color-mix(in_srgb,CanvasText_12%,transparent)] px-(--space-20) text-[1.0625rem] font-(--font-weight-semibold) active:opacity-60"
                          onClick={onSkip}
                        >
                          Pular
                        </Button>
                      ) : null}
                    </div>
                  )}
                  {item.status === 'done' && item.recordedSets.length > 0 ? (
                    <ul
                      aria-label={`Séries de ${item.name}`}
                      className="flex flex-col gap-(--space-4) pt-(--space-8) pr-(--space-20) pl-[calc(var(--space-20)+24px+var(--space-16))] text-[1.0625rem]"
                    >
                      {item.recordedSets.map((set) => (
                        <RecordedSetRow key={set.setNumber} set={set} />
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
            {finished ? null : (
              <Button
                className="min-h-(--target-workout) w-full rounded-(--radius-capsule) bg-[color-mix(in_srgb,CanvasText_12%,transparent)] px-(--space-24) text-[1.0625rem] font-(--font-weight-semibold) active:opacity-60"
                onClick={onEnd}
              >
                Encerrar
              </Button>
            )}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
