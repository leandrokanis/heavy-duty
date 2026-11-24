import { LevelBadge } from './level-badge'
import type { LevelCelebration as Celebration } from './workout-flow'

// The first level of a tier, or the top one, in full screen for about 1.7 s, with no tap: the
// screen under it keeps counting and takes taps. Decorative: the live region says the new level.
export function LevelCelebration({ name, level, tier }: Celebration) {
  return (
    <div
      aria-hidden="true"
      data-level-celebration=""
      className="pointer-events-none fixed inset-0 z-50 grid place-content-center justify-items-center gap-(--space-4) bg-[radial-gradient(circle_at_50%_45%,color-mix(in_srgb,var(--color-game-xp)_55%,var(--color-background))_0%,color-mix(in_srgb,var(--color-game-xp-2)_30%,var(--color-background))_45%,var(--color-background)_80%)] text-center text-(--color-label) animate-[level-celebration_var(--duration-level-celebration)_ease-out_both]"
    >
      <LevelBadge level={level} tier={tier} size={132} />
      <p className="m-0 mt-(--space-8) font-(--font-weight-heavy) text-(length:--font-size-title-1) first-letter:uppercase">
        {name}
      </p>
      <p className="m-0 font-(--font-weight-bold) text-(length:--font-size-headline)">{`Nível ${level}`}</p>
    </div>
  )
}
