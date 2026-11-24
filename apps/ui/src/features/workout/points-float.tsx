import { DoubleMark } from './double-mark'
import type { SetPointsView } from './workout-flow'

// The points of the set just recorded rise from "Próximo" (US-F10-01). Decorative: the live region
// of the screen speaks them. A new key per set restarts the rise; reduced motion only fades.
export function PointsFloat({ points, bonus }: Pick<SetPointsView, 'points' | 'bonus'>) {
  return (
    <div
      aria-hidden="true"
      data-points=""
      className="pointer-events-none absolute inset-x-0 bottom-full z-10 mb-(--space-8) flex items-center justify-center gap-(--space-8) animate-[points-float_var(--duration-points)_ease-out_both]"
    >
      <span className="bg-linear-to-r from-(--color-game-xp) to-(--color-game-xp-2) bg-clip-text font-(--font-weight-heavy) text-(length:--font-size-points) text-transparent leading-none tabular-nums">
        {`+${points}`}
      </span>
      {bonus === null ? null : <DoubleMark muscleMemory={bonus === 'muscleMemory'} />}
    </div>
  )
}
