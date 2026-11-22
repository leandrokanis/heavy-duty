import type { CSSProperties } from 'react'
import type { SequenceItem } from './workout-flow'

export type ExerciseBarProps = {
  items: SequenceItem[]
}

// Decorative: the progressbar "Exercícios" around it carries the value for the screen reader.
export function ExerciseBar({ items }: ExerciseBarProps) {
  return (
    <span aria-hidden="true" className="flex w-[132px] shrink-0 gap-(--space-4)">
      {items.map((item) => (
        <i
          key={item.exerciseIndex}
          data-status={item.status}
          style={
            {
              '--filled': `${Math.min(100, (item.setsDone / item.setsTotal) * 100)}%`,
            } as CSSProperties
          }
          className="block h-[6px] flex-1 overflow-hidden rounded-(--radius-capsule) bg-(--color-fill-strong) data-[status=current]:shadow-[inset_0_0_0_1.5px_var(--color-label)] data-[status=skipped]:bg-[repeating-linear-gradient(45deg,var(--color-fill-strong)_0_3px,transparent_3px_6px)]"
        >
          <b className="block h-full w-(--filled) rounded-(--radius-capsule) bg-(--color-label)" />
        </i>
      ))}
    </span>
  )
}
