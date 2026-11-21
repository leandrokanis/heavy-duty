'use client'

import { Button } from '@base-ui/react/button'
import { Drawer } from '@base-ui/react/drawer'
import { Check, Circle, CircleDot, X } from 'lucide-react'
import type { RefObject } from 'react'
import type { SequenceItem } from './workout-flow'

export type SequenceSheetProps = {
  open: boolean
  items: SequenceItem[]
  // A finished workout lists everything done, with no way to another exercise or to end it.
  finished: boolean
  // Where the focus goes when the sheet closes: the control that opened it.
  returnFocusRef: RefObject<HTMLElement | null>
  onClose: () => void
  onPick: (exerciseIndex: number) => void
  onEnd: () => void
}

const STATUS_LABEL = { done: 'Feito', current: 'Atual', todo: 'Por fazer' } as const

const STATUS_ICON = { done: Check, current: CircleDot, todo: Circle } as const

const ROW_CLASS =
  'flex min-h-(--target-workout) w-full items-center gap-(--space-16) rounded-(--radius-capsule) px-(--space-20) text-left'

function ItemContent({ item }: { item: SequenceItem }) {
  const Icon = STATUS_ICON[item.status]
  return (
    <>
      <Icon aria-hidden="true" size={24} className="shrink-0" />
      <span className="flex-1 text-[1.0625rem] font-(--font-weight-semibold)">{item.name}</span>
      <span className="opacity-70">{STATUS_LABEL[item.status]}</span>
      <span className="tabular-nums opacity-70">{`${item.setsDone} de ${item.setsTotal}`}</span>
    </>
  )
}

export function SequenceSheet({
  open,
  items,
  finished,
  returnFocusRef,
  onClose,
  onPick,
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
            className="glass flex flex-col gap-(--space-24) rounded-t-[28px] px-(--space-margin-inline) pt-(--space-20) pb-[calc(var(--space-24)+env(safe-area-inset-bottom))]"
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
            <ul className="flex flex-col gap-(--space-8)">
              {items.map((item) => (
                <li key={item.exerciseIndex}>
                  {item.status === 'todo' && !finished ? (
                    <Button
                      className={`${ROW_CLASS} bg-[color-mix(in_srgb,CanvasText_8%,transparent)] active:opacity-60`}
                      onClick={() => onPick(item.exerciseIndex)}
                    >
                      <ItemContent item={item} />
                    </Button>
                  ) : (
                    <div className={ROW_CLASS}>
                      <ItemContent item={item} />
                    </div>
                  )}
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
