'use client'

import { Check, SkipForward } from 'lucide-react'
import type { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { MotionButton } from '@/components/ui/motion-button'
import { Sheet } from '@/components/ui/sheet'
import { RecordedSetItem } from './recorded-set-item'
import type { SequenceItem } from './workout-flow'

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

const CIRCLE_CLASS =
  'flex size-[34px] shrink-0 items-center justify-center rounded-(--radius-circle) font-(--font-weight-bold) text-(length:--font-size-callout) tabular-nums leading-none after:content-[attr(data-position)] data-[status=current]:text-(--color-label) data-[status=current]:shadow-[inset_0_0_0_3px_var(--color-label)] data-[status=done]:bg-(--color-label) data-[status=skipped]:shadow-[inset_0_0_0_2px_var(--color-fill-strong)] data-[status=todo]:text-(--color-label-secondary) data-[status=todo]:shadow-[inset_0_0_0_2px_var(--color-fill-strong)]'

// Decorative: the name, the state and the count beside it carry the same for the screen reader.
// The position of the current and to-do rows is drawn by CSS, so it stays out of the row text.
function StatusCircle({ item }: { item: SequenceItem }) {
  const position =
    item.status === 'current' || item.status === 'todo' ? item.exerciseIndex + 1 : null
  return (
    <span
      aria-hidden="true"
      data-status={item.status}
      data-position={position ?? undefined}
      className={CIRCLE_CLASS}
    >
      {item.status === 'done' ? (
        <Check size={18} strokeWidth={2.6} className="text-(--color-background)" />
      ) : null}
      {item.status === 'skipped' ? (
        <SkipForward size={18} strokeWidth={1.8} className="text-(--color-label-secondary)" />
      ) : null}
    </span>
  )
}

function ItemContent({ item }: { item: SequenceItem }) {
  return (
    <>
      <StatusCircle item={item} />
      <span className="flex min-w-0 flex-1 flex-col gap-(--space-4) text-left">
        <span
          className={`break-words font-(--font-weight-bold) text-(length:--font-size-body) ${
            item.status === 'skipped' ? 'text-(--color-label-secondary)' : 'text-(--color-label)'
          }`}
        >
          {item.name}
        </span>
        <span className="flex flex-wrap gap-x-(--space-8) font-normal text-(--color-label-secondary) text-(length:--font-size-subheadline) tabular-nums">
          <span className="whitespace-nowrap">{STATUS_LABEL[item.status]}</span>
          <span className="whitespace-nowrap">{`${item.setsDone} de ${item.setsTotal}`}</span>
        </span>
      </span>
    </>
  )
}

const ROW_PADDING = '-mx-(--space-12) px-(--space-12) rounded-(--radius-inner)'

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
    <Sheet.Root
      open={open}
      finalFocus={returnFocusRef}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Sheet.Title>Sequência do treino</Sheet.Title>
      <ul
        aria-label="Exercícios"
        className="-mx-(--space-12) m-0 mt-(--space-4) flex min-h-0 flex-1 list-none flex-col overflow-y-auto overscroll-contain p-0 px-(--space-12) pb-px"
      >
        {items.map((item) => (
          <li
            key={item.exerciseIndex}
            data-status={item.status}
            className="border-(--color-separator) border-t first:border-t-0 data-[status=current]:border-t-0 [[data-status=current]+&]:border-t-0"
          >
            {(item.status === 'todo' || item.status === 'skipped') && !finished ? (
              <MotionButton
                tapScale={1}
                className={`${ROW_PADDING} flex min-h-16 w-[calc(100%+var(--space-24))] cursor-pointer items-center gap-(--space-12) py-(--space-12) transition-colors duration-(--duration-fast) data-pressed:bg-(--color-fill)`}
                onClick={() => onPick(item.exerciseIndex)}
              >
                <ItemContent item={item} />
              </MotionButton>
            ) : (
              <div
                className={`${ROW_PADDING} flex min-h-16 items-center gap-(--space-8) py-(--space-12) ${
                  item.status === 'current' ? 'bg-(--color-fill)' : ''
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-(--space-12)">
                  <ItemContent item={item} />
                </div>
                {item.status === 'current' && canSkip && !finished ? (
                  <Button
                    variant="secondary"
                    size="workout"
                    aria-label={`Pular ${item.name}`}
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
                className="m-0 flex list-none flex-wrap gap-(--space-8) p-0 pb-(--space-12) pl-[calc(34px+var(--space-12))]"
              >
                {item.recordedSets.map((set) => (
                  <RecordedSetItem key={set.setNumber} set={set} />
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      <Sheet.Actions>
        {finished ? null : (
          <Button variant="destructive" size="workout" onClick={onEnd}>
            Encerrar
          </Button>
        )}
        <Button
          variant="secondary"
          size="workout"
          className={finished ? 'col-span-2' : undefined}
          onClick={onClose}
        >
          Fechar
        </Button>
      </Sheet.Actions>
    </Sheet.Root>
  )
}
