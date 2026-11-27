import { useId } from 'react'
import type { MedalIcon as MedalIconName } from './medals.types'

// The filled game icons of prototype v1 (24 × 24), apart from the stroke icons of Lucide
// (DESIGN.md, Section 13); question stands for a hidden medal.
const PATH: Record<MedalIconName | 'question', string> = {
  bolt: 'M13.2 2 4.5 13.4h6.3L9.6 22l9-11.6h-6.4z',
  shield: 'M12 1.8 20.5 5v6.2c0 5.3-3.6 9.6-8.5 11-4.9-1.4-8.5-5.7-8.5-11V5z',
  medal:
    'M6.5 1.8h4.2l2 5.6-3.4 1.6zM17.5 1.8h-4.2l-1 2.8 1.6 4.4 1.9-.9zM12 8.4a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6z',
  trophy:
    'M6.5 2.5h11v2h3.2v1.8a4.6 4.6 0 0 1-4.3 4.6 5.6 5.6 0 0 1-3.3 3.2V17h3v2.2H8V17h3v-2.9a5.6 5.6 0 0 1-3.3-3.2 4.6 4.6 0 0 1-4.3-4.6V4.5h3.1zm-1.3 3.8a2.8 2.8 0 0 0 1.4 2.3V6.3zm13.6 0h-1.4v2.3a2.8 2.8 0 0 0 1.4-2.3zM6.5 20.2h11V22h-11z',
  flame:
    'M12.3 1.5c.8 3.7 5.7 6 5.7 11.6a6 6 0 0 1-12 .4c0-2.6 1.3-4.5 2.6-5.7.2 1.9 1.1 3.1 2.4 3.7-.6-3.6.1-7.1 1.3-10z',
  sparkle:
    'M12 1.5l2.4 7.1 7.1 2.4-7.1 2.4L12 20.5l-2.4-7.1L2.5 11l7.1-2.4zM19 16.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z',
  target:
    'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm0 3a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z',
  star: 'M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 16.9l-6.1 3.5 1.5-6.8L2.2 9l6.9-.7z',
  question:
    'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm.2 13.6a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zM12.3 6c-2.2 0-3.7 1.3-3.9 3.3h2.2c.1-.8.7-1.3 1.6-1.3s1.5.5 1.5 1.3c0 .7-.3 1-1.3 1.7-1.1.7-1.6 1.5-1.5 2.8v.5h2.1v-.4c0-.8.3-1.1 1.3-1.8 1.1-.7 1.7-1.6 1.7-2.9C16 7.3 14.5 6 12.3 6z',
}

// The game colors of each icon in prototype v1 (DESIGN.md, Section 11.1).
const GRADIENT: Record<MedalIconName, [string, string]> = {
  bolt: ['var(--color-game-xp)', 'var(--color-game-xp-2)'],
  shield: ['var(--color-game-xp)', 'var(--color-game-xp-2)'],
  medal: ['var(--color-game-gold-2)', 'var(--color-game-gold)'],
  trophy: ['var(--color-game-gold-2)', 'var(--color-game-gold)'],
  star: ['var(--color-game-gold-2)', 'var(--color-game-gold)'],
  flame: ['var(--color-game-flame)', 'var(--color-game-flame-2)'],
  sparkle: ['var(--color-game-record)', 'var(--color-game-record)'],
  target: ['var(--color-window-open)', 'var(--color-window-open)'],
}

const MUTED: [string, string] = ['var(--color-fill-strong)', 'var(--color-fill-strong)']

export type MedalIconProps = {
  icon: MedalIconName | null
  // A medal not yet awarded shows its icon in gray, as in prototype v1.
  muted?: boolean
  size: number
}

// Decorative: the text beside it says the medal to the screen reader.
export function MedalIcon({ icon, muted = false, size }: MedalIconProps) {
  const gradientId = useId()
  const [from, to] = icon === null || muted ? MUTED : GRADIENT[icon]
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} className="shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: from }} />
          <stop offset="1" style={{ stopColor: to }} />
        </linearGradient>
      </defs>
      <path d={PATH[icon ?? 'question']} fillRule="evenodd" fill={`url(#${gradientId})`} />
    </svg>
  )
}
