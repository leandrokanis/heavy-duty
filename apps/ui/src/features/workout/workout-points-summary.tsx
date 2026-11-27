import { Trophy } from 'lucide-react'
import { rankTextOf, type WorkoutRank } from './workout-rank'

// The points of the finished workout and its place in the personal ranking of the period (D105),
// provisional until the API answers with the workout.
export function WorkoutPointsSummary({ rank }: { rank: WorkoutRank }) {
  return (
    <section
      aria-label="Pontos do treino"
      className="mt-(--space-16) flex flex-col items-center gap-(--space-8)"
    >
      <p className="m-0 flex items-baseline gap-(--space-8)">
        <span className="bg-linear-to-r from-(--color-game-xp) to-(--color-game-xp-2) bg-clip-text font-(--font-weight-heavy) text-(length:--font-size-title-1) text-transparent leading-none tabular-nums">
          {`+${rank.points}`}
        </span>
        <span className="font-(--font-weight-semibold) text-(--color-label-secondary)">
          {` ${rank.points === 1 ? 'ponto' : 'pontos'}`}
        </span>
      </p>
      {rank.position === null ? null : (
        <p className="m-0 inline-flex items-center gap-(--space-8) rounded-(--radius-capsule) bg-(--color-fill) px-(--space-12) py-(--space-4) font-(--font-weight-semibold) text-(length:--font-size-subheadline)">
          <Trophy aria-hidden="true" size={18} className="text-(--color-game-gold)" />
          {rankTextOf(rank.position)}
        </p>
      )}
    </section>
  )
}
