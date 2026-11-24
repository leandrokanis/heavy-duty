'use client'

import { GAME_CONFIG } from '@heavy-duty/game'
import { MotionButton } from '@/components/ui/motion-button'
import { LevelBadge } from './level-badge'
import type { OverallLevelView } from './overall-level'
import { formatWindowWhen } from './window-format'

export type OverallLevelButtonProps = {
  view: OverallLevelView
  nowMs: number
  timeZone?: string
  onPress: () => void
}

function capitalized(name: string): string {
  return name.charAt(0).toLocaleUpperCase('pt-BR') + name.slice(1)
}

function nameOf({ level, group, target }: OverallLevelView, nowMs: number, timeZone?: string) {
  const limited = `Nível geral ${level} de ${GAME_CONFIG.maxLevel}, limitado por ${group.name}`
  if (target.kind === 'resting') {
    return `${limited}, que abre ${formatWindowWhen(target.opensAtMs, nowMs, timeZone)}`
  }
  return `${limited}. Treinar a letra ${target.day.letter}`
}

// The overall level in the game strip: the seal of its tier with the level, and the group that
// limits it (D29). The name of the button tells where the tap leads (D39, D68).
export function OverallLevelButton({ view, nowMs, timeZone, onPress }: OverallLevelButtonProps) {
  return (
    <MotionButton
      tapScale={1}
      aria-label={nameOf(view, nowMs, timeZone)}
      onClick={onPress}
      className="flex min-h-[44px] w-full min-w-0 cursor-pointer select-none flex-col items-center gap-(--space-4) rounded-(--radius-card) bg-(--color-background-grouped) px-(--space-8) py-(--space-12) text-center text-(--color-label) transition-colors duration-(--duration-fast) data-pressed:bg-(--color-fill)"
    >
      <LevelBadge level={view.level} tier={view.tier} size={32} />
      <span className="font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-footnote)">
        nível geral
      </span>
      <span className="w-full truncate font-(--font-weight-bold) text-(length:--font-size-subheadline)">
        {capitalized(view.group.name)}
      </span>
    </MotionButton>
  )
}

export function restingLineOf(view: OverallLevelView, nowMs: number, timeZone?: string): string {
  if (view.target.kind !== 'resting') return ''
  return `${capitalized(view.group.name)} abre ${formatWindowWhen(view.target.opensAtMs, nowMs, timeZone)}`
}
