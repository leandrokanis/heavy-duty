import type { CSSProperties } from 'react'
import { LevelBadge } from './level-badge'
import type { MuscleGroupLevel, MuscleGroupLevels } from './levels.types'
import type { WindowBadge } from './window-badges'
import { formatCoolingFor, formatWindowWhen } from './window-format'

export type WindowBadgeListProps = {
  badges: WindowBadge[]
  // The level of each group beside its window (D61); absent while the levels are unknown.
  levels?: MuscleGroupLevels | null
  nowMs: number
  timeZone?: string
}

const HATCH =
  'repeating-linear-gradient(45deg, var(--color-window-cooling) 0 2px, color-mix(in srgb, var(--color-window-cooling) 35%, transparent) 2px 5px)'

function capitalized(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function phraseOf(badge: WindowBadge, nowMs: number, timeZone?: string): string {
  const group = capitalized(badge.name)
  if (badge.state === 'open')
    return `${group} · fecha ${formatWindowWhen(badge.atMs, nowMs, timeZone)}`
  if (badge.state === 'resting')
    return `${group} · abre ${formatWindowWhen(badge.atMs, nowMs, timeZone)}`
  return `${group} · esfriando ${formatCoolingFor(badge.atMs, nowMs)}`
}

function levelOf(levels: MuscleGroupLevels | null | undefined, slug: string) {
  const level = levels?.groups.find(({ muscleGroup }) => muscleGroup.slug === slug)
  return level ? <LevelOfGroup level={level} /> : null
}

const INDICATOR_COLOR = {
  open: 'var(--color-window-open)',
  resting: 'var(--color-window-rest)',
  cooling: 'var(--color-window-cooling)',
} as const

// Spans with roles, so it can sit inside the button of a row: the text joins the name of the button.
// The text stays in the label colour; the state colour is on the indicator only (DESIGN.md, Section 18.1).
// The seal and a short bar of the level; the screen reader hears the level from the phrase.
function LevelOfGroup({ level }: { level: MuscleGroupLevel }) {
  const fill = `${Math.round((level.points / level.levelCost) * 100)}%`
  return (
    <>
      <span className="sr-only">{`, nível ${level.level}`}</span>
      <LevelBadge level={level.level} tier={level.tier} size={20} />
      <span
        aria-hidden="true"
        className="block h-[4px] w-[24px] overflow-hidden rounded-(--radius-capsule) bg-(--color-fill)"
      >
        <b
          data-level-bar=""
          style={{ '--level-fill': fill } as CSSProperties}
          className="block h-full w-(--level-fill) rounded-(--radius-capsule) bg-linear-to-r from-(--color-game-xp) to-(--color-game-xp-2)"
        />
      </span>
    </>
  )
}

export function WindowBadgeList({ badges, levels, nowMs, timeZone }: WindowBadgeListProps) {
  if (badges.length === 0) return null
  return (
    // biome-ignore lint/a11y/useSemanticElements: a ul cannot sit inside the button of the row.
    <span role="list" className="flex flex-wrap gap-x-(--space-12) gap-y-(--space-4)">
      {badges.map((badge) => (
        // biome-ignore lint/a11y/useSemanticElements: an li cannot sit inside the button of the row.
        <span
          key={badge.slug}
          role="listitem"
          className="inline-flex items-center gap-(--space-4) text-(--color-label) text-(length:--font-size-footnote)"
        >
          <span
            aria-hidden="true"
            data-hatched={badge.state === 'cooling' ? '' : undefined}
            className="size-[10px] shrink-0 rounded-(--radius-circle)"
            style={
              badge.state === 'cooling'
                ? { background: HATCH }
                : { background: INDICATOR_COLOR[badge.state] }
            }
          />
          {phraseOf(badge, nowMs, timeZone)}
          {levelOf(levels, badge.slug)}
        </span>
      ))}
    </span>
  )
}
