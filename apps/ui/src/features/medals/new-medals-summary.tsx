import { MedalIcon } from './medal-icon'
import { medalTitleOf } from './medal-shelf'
import type { Medal } from './medals.types'

export type NewMedalsSummaryProps = { medals: readonly Medal[] }

// The medals the workout awarded, on the workout done (docs/gamificacao.md, D104).
export function NewMedalsSummary({ medals }: NewMedalsSummaryProps) {
  if (medals.length === 0) return null
  return (
    <section aria-labelledby="new-medals-title" className="flex w-full flex-col gap-(--space-8)">
      <h2
        id="new-medals-title"
        className="m-0 px-(--space-4) font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-footnote) uppercase tracking-(--font-tracking-caps)"
      >
        Medalhas novas
      </h2>
      <ul className="m-0 flex list-none flex-col overflow-hidden rounded-(--radius-card) bg-(--color-background-grouped) p-0">
        {medals.map((medal) => (
          <li
            key={medal.code}
            className="flex items-center gap-(--space-12) border-(--color-separator) border-t px-(--space-16) py-(--space-12) first:border-t-0"
          >
            <span className="grid size-10 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-game-gold)_18%,transparent)]">
              <MedalIcon icon={medal.icon} size={24} />
            </span>
            <span className="font-(--font-weight-semibold) text-(length:--font-size-body)">
              {medalTitleOf(medal)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
