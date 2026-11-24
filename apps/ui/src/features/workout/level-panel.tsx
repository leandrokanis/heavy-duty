'use client'

import { Progress } from '@base-ui/react/progress'
import { levelCostOf, tierOf } from '@heavy-duty/game'
import { type CSSProperties, useEffect, useState } from 'react'
import { DoubleMark } from './double-mark'
import { LevelBadge } from './level-badge'
import type { GroupLevelRow } from './workout-flow'

function percentOf({ level, points }: GroupLevelRow['after']): number {
  return Math.min(100, (points / levelCostOf(level)) * 100)
}

function capitalized(name: string): string {
  return name.charAt(0).toLocaleUpperCase('pt-BR') + name.slice(1)
}

// The bar starts where the set found it, or empty after a new level, and fills to where the set
// left it; with reduced motion it shows the end at once (DESIGN.md, Section 15).
function useFill(row: GroupLevelRow): number {
  const climbed = row.after.level > row.before.level
  const [fill, setFill] = useState(() => (climbed ? 0 : percentOf(row.before)))
  const target = percentOf(row.after)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFill(target))
    return () => cancelAnimationFrame(frame)
  }, [target])
  return fill
}

function LevelRow({ row }: { row: GroupLevelRow }) {
  const fill = useFill(row)
  const { level, points } = row.after
  const name = capitalized(row.name)
  return (
    <li className="flex items-center gap-(--space-12)">
      <span
        // A new key per level restarts the bump of the seal.
        key={level}
        className="inline-grid animate-[level-bump_var(--duration-base)_ease-out]"
      >
        <LevelBadge level={level} tier={tierOf(level)} size={38} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-(--space-4)">
        <span className="flex items-baseline justify-between gap-(--space-8) font-(--font-weight-bold) text-(length:--font-size-callout)">
          <span className="truncate">{name}</span>
          <span className="flex items-center gap-(--space-8)">
            {row.bonus === 'muscleMemory' ? (
              <DoubleMark muscleMemory aria-label="Recuperação em dobro" />
            ) : null}
            <span className="bg-linear-to-r from-(--color-game-xp) to-(--color-game-xp-2) bg-clip-text text-transparent tabular-nums">
              {`+${row.gain}`}
            </span>
          </span>
        </span>
        <Progress.Root
          aria-label={`Nível de ${row.name}`}
          getAriaValueText={() => `Nível ${level}, ${points} de ${levelCostOf(level)} pontos`}
          max={100}
          value={percentOf(row.after)}
        >
          <span
            aria-hidden="true"
            className="block h-[10px] overflow-hidden rounded-(--radius-capsule) bg-(--color-fill)"
          >
            <b
              data-level-fill=""
              style={{ '--level-fill': `${fill}%` } as CSSProperties}
              className="block h-full w-(--level-fill) rounded-(--radius-capsule) bg-linear-to-r from-(--color-game-xp) to-(--color-game-xp-2) transition-[width] duration-(--duration-level-bar) ease-out motion-reduce:transition-none"
            />
          </span>
        </Progress.Root>
      </span>
    </li>
  )
}

export type LevelPanelProps = { rows: GroupLevelRow[] }

// The bars of the groups of the set just recorded, in the rest (docs/gamificacao.md, "Dentro do treino").
export function LevelPanel({ rows }: LevelPanelProps) {
  if (rows.length === 0) return null
  return (
    <ul
      aria-label="Níveis dos grupos"
      className="m-0 flex w-full max-w-[360px] list-none flex-col gap-(--space-12) p-0"
    >
      {rows.map((row) => (
        <LevelRow key={row.slug} row={row} />
      ))}
    </ul>
  )
}
