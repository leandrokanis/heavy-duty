import { useId } from 'react'
import type { LeftOutItem } from './workout-flow'

// The exercises skipped and not done, on the screen of a finished workout (FR-013).
export function LeftOutSummary({ items }: { items: LeftOutItem[] }) {
  const titleId = useId()
  if (items.length === 0) return null
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-(--space-12)">
      <h2 id={titleId} className="text-[1.25rem] font-(--font-weight-semibold)">
        Ficaram de fora
      </h2>
      <ul className="flex flex-col gap-(--space-8)">
        {items.map((item) => (
          <li
            key={item.plannedExerciseId}
            className="flex min-h-(--target-workout) items-center gap-(--space-16) rounded-(--radius-capsule) bg-[color-mix(in_srgb,CanvasText_8%,transparent)] px-(--space-20)"
          >
            <span className="min-w-0 flex-1 truncate text-[1.0625rem] font-(--font-weight-semibold)">
              {item.name}
            </span>
            <span className="tabular-nums opacity-70">{`${item.setsDone} de ${item.setsTotal}`}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
