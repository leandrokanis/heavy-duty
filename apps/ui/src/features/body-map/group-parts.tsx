import type { CSSProperties } from 'react'
import type { MuscleGroupLevel } from '@/features/workout/levels.types'
import { DRAIN, HATCH } from '@/features/workout/window-badge-list'
import { type BodyMapGroup, figureStateOf } from './body-map'

export function capitalized(name: string): string {
  return name.charAt(0).toLocaleUpperCase('pt-BR') + name.slice(1)
}

const INDICATOR_COLOR = {
  open: 'var(--color-window-open)',
  resting: 'var(--color-window-rest)',
  neutral: 'var(--color-fill-strong)',
} as const

// The colour of the figure, beside the text of the state; the cooling one is hatched (DESIGN.md 18.1).
export function StateIndicator({ group }: { group: BodyMapGroup }) {
  const state = figureStateOf(group)
  return (
    <span
      aria-hidden="true"
      data-hatched={state === 'cooling' ? '' : undefined}
      className="size-[10px] shrink-0 rounded-(--radius-circle)"
      style={{ background: state === 'cooling' ? HATCH : INDICATOR_COLOR[state] }}
    />
  )
}

const BAR_HEIGHT = { small: 'h-[4px]', large: 'h-[10px]' } as const

// The bar of the level, in stripes while the group cools (US-F10-03); the text says the level.
export function LevelBar({
  level,
  size,
}: {
  level: MuscleGroupLevel
  size: keyof typeof BAR_HEIGHT
}) {
  const fill = `${Math.min(100, Math.round((level.points / level.levelCost) * 100))}%`
  const cooling = level.cooling === true
  return (
    <span
      aria-hidden="true"
      className={`block w-full overflow-hidden rounded-(--radius-capsule) bg-(--color-fill) ${BAR_HEIGHT[size]}`}
    >
      <b
        data-level-bar=""
        data-cooling={cooling ? '' : undefined}
        style={{ '--level-fill': fill, ...(cooling ? { background: DRAIN } : {}) } as CSSProperties}
        className="block h-full w-(--level-fill) rounded-(--radius-capsule) bg-linear-to-r from-(--color-game-xp) to-(--color-game-xp-2)"
      />
    </span>
  )
}
