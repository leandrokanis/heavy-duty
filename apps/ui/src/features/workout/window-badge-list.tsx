import type { WindowBadge } from './window-badges'
import { formatCoolingFor, formatWindowWhen } from './window-format'

export type WindowBadgeListProps = {
  badges: WindowBadge[]
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

const INDICATOR_COLOR = {
  open: 'var(--color-window-open)',
  resting: 'var(--color-window-rest)',
  cooling: 'var(--color-window-cooling)',
} as const

// Spans with roles, so it can sit inside the button of a row: the text joins the name of the button.
// The text stays in the label colour; the state colour is on the indicator only (DESIGN.md, Section 18.1).
export function WindowBadgeList({ badges, nowMs, timeZone }: WindowBadgeListProps) {
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
        </span>
      ))}
    </span>
  )
}
