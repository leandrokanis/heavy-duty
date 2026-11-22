import type { CSSProperties } from 'react'
import type { SequenceItem } from './workout-flow'

export type ExerciseBarProps = {
  items: SequenceItem[]
  // compact: the control at the top of the workout; full: the width of the sheet that holds it.
  size?: 'compact' | 'full'
}

const ROOT_CLASS = {
  compact: 'flex w-[132px] shrink-0 gap-(--space-4)',
  full: 'flex w-full gap-(--space-4)',
} as const

const SEGMENT_CLASS = {
  compact:
    'h-[6px] data-[status=current]:shadow-[inset_0_0_0_1.5px_var(--color-label)] data-[status=skipped]:bg-[repeating-linear-gradient(45deg,var(--color-fill-strong)_0_3px,transparent_3px_6px)]',
  full: 'h-[10px] data-[status=skipped]:bg-[repeating-linear-gradient(45deg,var(--color-fill-strong)_0_4px,transparent_4px_8px)]',
} as const

// Decorative: the progressbar "Exercícios" around it carries the value for the screen reader.
export function ExerciseBar({ items, size = 'compact' }: ExerciseBarProps) {
  return (
    <span aria-hidden="true" data-size={size} className={ROOT_CLASS[size]}>
      {items.map((item) => (
        <i
          key={item.exerciseIndex}
          data-status={item.status}
          style={
            {
              '--filled': `${Math.min(100, (item.setsDone / item.setsTotal) * 100)}%`,
            } as CSSProperties
          }
          className={`block flex-1 overflow-hidden rounded-(--radius-capsule) bg-(--color-fill-strong) ${SEGMENT_CLASS[size]}`}
        >
          <b className="block h-full w-(--filled) rounded-(--radius-capsule) bg-(--color-label)" />
        </i>
      ))}
    </span>
  )
}
