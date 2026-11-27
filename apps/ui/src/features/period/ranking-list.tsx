import type { RankedWorkout } from './period.types'

const SHOWN_WORKOUTS = 5
const CARD_CLASS = 'rounded-(--radius-card) bg-(--color-background-grouped)'
// The first three as the tiers of the level badge: gold, silver and bronze, with their text colors.
const MEDAL_CLASS: Record<number, string> = {
  1: 'bg-linear-to-br from-(--color-game-gold) to-(--color-game-gold-2) text-(--color-on-tier-light)',
  2: 'bg-linear-to-br from-(--color-tier-2) to-(--color-tier-2-2) text-(--color-on-tier-light)',
  3: 'bg-linear-to-br from-(--color-tier-1) to-(--color-tier-1-2) text-(--color-on-tier)',
}

function dayOf(startedAt: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(Date.parse(startedAt))
}

export type RankingListProps = {
  ranking: RankedWorkout[]
  // The device time zone when absent.
  timeZone?: string
}

// The personal ranking of the period (US-F19-02, D105): only against the athlete's own workouts,
// the first 5 as in the prototype v1.
export function RankingList({ ranking, timeZone }: RankingListProps) {
  if (ranking.length === 0) {
    return (
      <p className={`${CARD_CLASS} m-0 p-(--space-16) text-(--color-label-secondary)`}>
        Os treinos do período aparecem aqui, por pontos.
      </p>
    )
  }
  return (
    <ol
      aria-label="Ranking dos seus treinos"
      className={`${CARD_CLASS} m-0 flex list-none flex-col px-(--space-16) py-(--space-4)`}
    >
      {ranking
        .slice(0, SHOWN_WORKOUTS)
        .map(({ workoutId, letter, startedAt, points, position }) => (
          <li
            key={workoutId}
            className="flex items-center gap-(--space-12) border-(--color-separator) border-b py-(--space-12) last:border-b-0"
          >
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-(--radius-circle) font-(--font-weight-heavy) tabular-nums ${MEDAL_CLASS[position] ?? 'bg-(--color-fill)'}`}
            >
              <span className="sr-only">Posição </span>
              {position}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-(--font-weight-semibold)">{`Letra ${letter}`}</span>
              <span className="text-(--color-label-secondary) text-(length:--font-size-footnote)">
                {dayOf(startedAt, timeZone)}
              </span>
            </span>
            <span className="font-(--font-weight-heavy) tabular-nums">
              {`${points} ${points === 1 ? 'ponto' : 'pontos'}`}
            </span>
          </li>
        ))}
    </ol>
  )
}
