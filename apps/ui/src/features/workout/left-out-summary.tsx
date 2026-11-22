import { SkipForward } from 'lucide-react'
import { useId } from 'react'
import { SetPips } from './set-pips'
import type { LeftOutItem } from './workout-flow'

// The exercises skipped and not done, on the screen of a finished workout (FR-013).
export function LeftOutSummary({ items }: { items: LeftOutItem[] }) {
  const titleId = useId()
  if (items.length === 0) return null
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-(--space-8)">
      <h2
        id={titleId}
        className="m-0 px-(--space-4) font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-footnote) uppercase tracking-(--font-tracking-caps)"
      >
        Ficaram de fora
      </h2>
      <ul className="m-0 flex list-none flex-col overflow-hidden rounded-(--radius-card) bg-(--color-background-grouped) p-0">
        {items.map((item) => (
          <li
            key={item.plannedExerciseId}
            className="flex flex-col gap-(--space-8) border-(--color-separator) border-t px-(--space-16) py-(--space-12) first:border-t-0"
          >
            <span className="font-(--font-weight-semibold) text-(--color-label) text-(length:--font-size-body)">
              {item.name}
            </span>
            <span className="flex items-center gap-(--space-8)">
              <span
                aria-hidden="true"
                className="inline-flex items-center rounded-(--radius-capsule) bg-(--color-fill) px-(--space-12) py-(--space-4)"
              >
                <SkipForward
                  size={22}
                  strokeWidth={1.8}
                  className="text-(--color-label-secondary)"
                />
              </span>
              <SetPips total={item.setsTotal} recorded={item.setsDone} />
              <span className="text-(--color-label-secondary) text-(length:--font-size-subheadline) tabular-nums">{`${item.setsDone} de ${item.setsTotal}`}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
