import { Check } from 'lucide-react'

export type SetDotsProps = {
  total: number
  recorded: number
  // Index of the set the athlete is on, or null when none is current (rest end, finished workout).
  current: number | null
}

const DOT_CLASS =
  'inline-flex size-10 items-center justify-center rounded-(--radius-circle) font-(--font-weight-bold) text-(length:--font-size-headline) tabular-nums leading-none'

// Decorative: the progressbar "Séries" carries the same information for the screen reader.
export function SetDots({ total, recorded, current }: SetDotsProps) {
  return (
    <div aria-hidden="true" className="flex flex-wrap justify-center gap-(--space-8)">
      {Array.from({ length: total }, (_, index) => {
        const done = index < recorded
        const now = index === current
        if (done) {
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: the dots are positions, not items
              key={index}
              data-dot=""
              data-recorded="true"
              className={`${DOT_CLASS} bg-(--color-label)`}
            >
              <Check
                aria-hidden="true"
                size={20}
                strokeWidth={2.4}
                className="text-(--color-background)"
              />
            </span>
          )
        }
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: the dots are positions, not items
            key={index}
            data-dot=""
            data-current={now ? '' : undefined}
            className={
              now
                ? `${DOT_CLASS} bg-(--color-background-grouped) text-(--color-label) shadow-[inset_0_0_0_3px_var(--color-label)]`
                : `${DOT_CLASS} text-(--color-label-secondary) shadow-[inset_0_0_0_2px_var(--color-fill-strong)]`
            }
          >
            {index + 1}
          </span>
        )
      })}
    </div>
  )
}
