import { useId } from 'react'
import type { Tier } from './levels.types'

// The shapes of the tiers from prototype v1 (24 × 24): circle, shield, hexagon and star, so the tier
// does not depend on the colour alone (DESIGN.md, Section 11.1).
const SHAPE: Record<Tier, string> = {
  bronze: 'M12 1.5a10.5 10.5 0 1 1 0 21 10.5 10.5 0 0 1 0-21z',
  silver: 'M12 1.2 20.6 4.6v6.6c0 5.4-3.7 9.8-8.6 11.4-4.9-1.6-8.6-6-8.6-11.4V4.6z',
  gold: 'M12 .9l9.6 5.55v11.1L12 23.1l-9.6-5.55V6.45z',
  violet:
    'M12 .4l2.48 2.33 3.32-.78.99 3.26 3.26.99-.78 3.32L23.6 12l-2.33 2.48.78 3.32-3.26.99-.99 3.26-3.32-.78L12 23.6l-2.48-2.33-3.32.78-.99-3.26-3.26-.99.78-3.32L.4 12l2.33-2.48-.78-3.32 3.26-.99.99-3.26 3.32.78z',
}

const GRADIENT: Record<Tier, [string, string]> = {
  bronze: ['var(--color-tier-1)', 'var(--color-tier-1-2)'],
  silver: ['var(--color-tier-2)', 'var(--color-tier-2-2)'],
  gold: ['var(--color-tier-3)', 'var(--color-tier-3-2)'],
  violet: ['var(--color-tier-4)', 'var(--color-tier-4-2)'],
}

// Silver and gold are light, so their number is dark, as in the prototype.
const NUMBER_COLOR: Record<Tier, string> = {
  bronze: 'text-(--color-on-tier)',
  silver: 'text-(--color-on-tier-light)',
  gold: 'text-(--color-on-tier-light)',
  violet: 'text-(--color-on-tier)',
}

export type LevelBadgeProps = {
  level: number
  tier: Tier
  // Side in px; the number scales with it.
  size: number
  // A cooling group loses the colour of its tier and takes the colour of the cooling (US-F10-03).
  cold?: boolean
}

// Decorative: the text beside it says the level to the screen reader.
const COLD: [string, string] = ['var(--color-window-cooling)', 'var(--color-window-cooling)']

export function LevelBadge({ level, tier, size, cold = false }: LevelBadgeProps) {
  const gradientId = useId()
  const [from, to] = cold ? COLD : GRADIENT[tier]
  return (
    <span
      aria-hidden="true"
      data-tier={tier}
      data-cold={cold ? '' : undefined}
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full" role="presentation">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: from }} />
            <stop offset="1" style={{ stopColor: to }} />
          </linearGradient>
        </defs>
        <path d={SHAPE[tier]} fill={`url(#${gradientId})`} />
      </svg>
      <b
        className={`relative font-(--font-weight-heavy) leading-none tabular-nums ${
          cold ? 'text-(--color-on-tier)' : NUMBER_COLOR[tier]
        }`}
        style={{ fontSize: Math.round(size * 0.38) }}
      >
        {level}
      </b>
    </span>
  )
}
