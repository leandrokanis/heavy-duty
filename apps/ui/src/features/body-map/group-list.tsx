'use client'

import { ChevronRight } from 'lucide-react'
import { MotionButton } from '@/components/ui/motion-button'
import { DoubleMark } from '@/features/workout/double-mark'
import { LevelBadge } from '@/features/workout/level-badge'
import { type BodyMapGroup, stateTextOf } from './body-map'
import { capitalized, LevelBar, StateIndicator } from './group-parts'

export type GroupListProps = {
  groups: BodyMapGroup[]
  nowMs: number
  timeZone?: string
  onSelect: (slug: string) => void
}

// The text equivalent of the figure: the name of each button carries the state and the level.
function labelOf(group: BodyMapGroup, stateText: string): string {
  const parts = [capitalized(group.name), stateText]
  if (group.level) parts.push(`nível ${group.level.level}`)
  if (group.level?.muscleMemory) parts.push('recuperação em dobro')
  return parts.join(', ')
}

// The divider starts where the name starts: row padding (16) + seal (38) + gap (12).
const DIVIDER_LEFT = 'left-[66px]'

export function GroupList({ groups, nowMs, timeZone, onSelect }: GroupListProps) {
  return (
    <ul
      aria-label="Grupos musculares"
      className="m-0 flex list-none flex-col overflow-hidden rounded-(--radius-card) bg-(--color-background-grouped) p-0"
    >
      {groups.map((group, index) => {
        const stateText = stateTextOf(group, nowMs, timeZone)
        const { level } = group
        return (
          <li key={group.slug} className="relative">
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={`absolute top-0 right-0 h-px bg-(--color-separator) ${DIVIDER_LEFT}`}
              />
            ) : null}
            <MotionButton
              tapScale={1}
              aria-label={labelOf(group, stateText)}
              className="flex min-h-[64px] w-full cursor-pointer select-none items-center gap-(--space-12) px-(--space-16) py-(--space-12) text-left text-(--color-label) transition-colors duration-(--duration-fast) data-pressed:bg-(--color-fill)"
              onClick={() => onSelect(group.slug)}
            >
              {level ? (
                <LevelBadge
                  level={level.level}
                  tier={level.tier}
                  size={38}
                  cold={level.cooling === true}
                />
              ) : null}
              <span className="flex min-w-0 flex-1 flex-col gap-(--space-4)">
                <span className="flex items-center gap-(--space-8)">
                  <span className="truncate font-(--font-weight-semibold) text-(length:--font-size-headline)">
                    {capitalized(group.name)}
                  </span>
                  {level?.muscleMemory ? <DoubleMark muscleMemory /> : null}
                </span>
                <span className="flex items-center gap-(--space-4) text-(length:--font-size-footnote)">
                  <StateIndicator group={group} />
                  {stateText}
                </span>
                {level ? <LevelBar level={level} size="small" /> : null}
              </span>
              <ChevronRight
                aria-hidden="true"
                size={22}
                className="shrink-0 text-(--color-label-secondary)"
              />
            </MotionButton>
          </li>
        )
      })}
    </ul>
  )
}
