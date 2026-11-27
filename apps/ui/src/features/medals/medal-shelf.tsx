import { capitalized } from '@/features/body-map/group-parts'
import { MedalIcon } from './medal-icon'
import type { Medal } from './medals.types'

export type MedalShelfProps = { medals: readonly Medal[] }

// "Nível 10 · Peito": the group of a level medal comes with its name.
export function medalTitleOf(medal: Medal): string {
  const name = medal.name ?? 'Medalha oculta'
  return medal.subject ? `${name} · ${capitalized(medal.subject.name)}` : name
}

function MedalCard({ medal }: { medal: Medal }) {
  const awarded = medal.awardedAt !== null
  const secret = medal.name === null
  return (
    <li
      aria-label={
        secret
          ? 'Medalha oculta'
          : `${medalTitleOf(medal)}, ${awarded ? 'conquistada' : 'a conquistar'}`
      }
      data-awarded={awarded ? '' : undefined}
      className="grid content-start justify-items-center gap-(--space-4) rounded-(--radius-card) bg-(--color-background-grouped) px-(--space-8) py-(--space-12) text-center"
    >
      <span
        className={`grid size-14 place-items-center rounded-full ${awarded ? 'bg-[color-mix(in_srgb,var(--color-game-gold)_18%,transparent)]' : 'bg-(--color-fill)'}`}
      >
        <MedalIcon icon={medal.icon} muted={!awarded} size={30} />
      </span>
      <span
        aria-hidden="true"
        className={`font-(--font-weight-bold) text-(length:--font-size-footnote) ${awarded ? 'text-(--color-label)' : 'text-(--color-label-secondary)'}`}
      >
        {secret ? '???' : medalTitleOf(medal)}
      </span>
      {medal.criterion && !awarded && (
        <span
          aria-hidden="true"
          className="text-(--color-label-secondary) text-(length:--font-size-footnote)"
        >
          {medal.criterion}
        </span>
      )}
    </li>
  )
}

// The shelf of the Period screen: the medals awarded in color, the others in gray and the hidden
// ones as ???, revealed when awarded (prototype v1, Octalysis core 7).
export function MedalShelf({ medals }: MedalShelfProps) {
  return (
    <ul
      aria-label="Medalhas"
      className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-(--space-8) p-0"
    >
      {medals.map((medal) => (
        <MedalCard key={medal.code} medal={medal} />
      ))}
    </ul>
  )
}
