'use client'

import { Progress } from '@base-ui/react/progress'
import { ArrowDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { formatWorkoutDate } from '@/features/history/history-format'
import type { WindowsTally } from '@/features/period/period.types'
import { DoubleMark } from '@/features/workout/double-mark'
import { LevelBadge } from '@/features/workout/level-badge'
import { formatCoolingFor, formatWindowWhen } from '@/features/workout/window-format'
import { type BodyMapGroup, stateTextOf } from './body-map'
import { capitalized, LevelBar, StateIndicator } from './group-parts'

export type GroupSheetProps = {
  group: BodyMapGroup | null
  // The windows of the group in the current period; null while the period is unknown.
  periodProgress?: WindowsTally | null
  nowMs: number
  timeZone?: string
  onClose: () => void
}

function windowTextOf({ state, opensAtMs, closesAtMs }: BodyMapGroup, nowMs: number, tz?: string) {
  if (state === 'resting' && opensAtMs !== null)
    return `Abre ${formatWindowWhen(opensAtMs, nowMs, tz)}`
  if (state === 'open' && closesAtMs !== null)
    return `Fecha ${formatWindowWhen(closesAtMs, nowMs, tz)}`
  if (state === 'cooling' && closesAtMs !== null)
    return `Fechou ${formatCoolingFor(closesAtMs, nowMs)}`
  return 'Sem treino'
}

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-(--space-12) border-(--color-separator) border-b py-(--space-12) last:border-b-0">
      <dt className="text-(--color-label-secondary)">{term}</dt>
      <dd className="m-0 flex items-center gap-(--space-8) text-right font-(--font-weight-semibold)">
        {children}
      </dd>
    </div>
  )
}

// The detail of a group from the copies on the device (decision 15 of wave 7a), with the rate of
// windows used in the period as its progress in the period (D100).
export function GroupSheet({ group, periodProgress, nowMs, timeZone, onClose }: GroupSheetProps) {
  return (
    <Sheet.Root
      open={group !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {group ? (
        <GroupDetail
          group={group}
          periodProgress={periodProgress}
          nowMs={nowMs}
          timeZone={timeZone}
        />
      ) : null}
      {group ? (
        <Button
          variant="secondary"
          size="large"
          className="mt-(--space-16) w-full"
          onClick={onClose}
        >
          Fechar
        </Button>
      ) : null}
    </Sheet.Root>
  )
}

function GroupDetail({
  group,
  periodProgress,
  nowMs,
  timeZone,
}: Omit<GroupSheetProps, 'onClose' | 'group'> & {
  group: BodyMapGroup
}) {
  const { level } = group
  const dropAtMs = level?.cooling && level.nextDropAt ? Date.parse(level.nextDropAt) : null
  return (
    <>
      <Sheet.Title>{capitalized(group.name)}</Sheet.Title>
      <p className="m-0 flex items-center gap-(--space-8) text-(--color-label) text-(length:--font-size-callout)">
        <StateIndicator group={group} />
        {stateTextOf(group, nowMs, timeZone)}
      </p>
      <Sheet.Body>
        {level ? (
          <div className="mt-(--space-16) flex items-center gap-(--space-12)">
            <LevelBadge
              level={level.level}
              tier={level.tier}
              size={44}
              cold={level.cooling === true}
            />
            <Progress.Root
              aria-label={`Nível de ${group.name}`}
              getAriaValueText={() =>
                `Nível ${level.level}, ${level.points} de ${level.levelCost} pontos`
              }
              max={level.levelCost}
              value={Math.min(level.points, level.levelCost)}
              className="flex min-w-0 flex-1 flex-col gap-(--space-4)"
            >
              <span
                aria-hidden="true"
                className="flex justify-between font-(--font-weight-semibold) tabular-nums"
              >
                <span>{`Nível ${level.level}`}</span>
                <span className="text-(--color-label-secondary)">
                  {`${level.points} / ${level.levelCost}`}
                </span>
              </span>
              <LevelBar level={level} size="large" />
            </Progress.Root>
          </div>
        ) : null}
        <dl className="m-0 mt-(--space-12)">
          {dropAtMs !== null && level ? (
            <Detail term="Queda">
              <ArrowDown aria-hidden="true" size={16} />
              {`Nível ${level.level - 1} ${formatWindowWhen(dropAtMs, nowMs, timeZone)}`}
            </Detail>
          ) : null}
          {level ? (
            <Detail term="Melhor nível">
              {level.bestLevel}
              {level.muscleMemory ? (
                <DoubleMark muscleMemory aria-label="Recuperação em dobro" />
              ) : null}
            </Detail>
          ) : null}
          {periodProgress ? (
            <Detail term="Progresso no período">
              {periodProgress.usedPercent === null
                ? 'Nenhuma janela terminou'
                : `${periodProgress.usedPercent} %`}
            </Detail>
          ) : null}
          <Detail term="Janela">{windowTextOf(group, nowMs, timeZone)}</Detail>
          <Detail term="Último treino">
            {group.lastTrainedAtMs === null
              ? 'Nenhum'
              : capitalized(
                  formatWorkoutDate(new Date(group.lastTrainedAtMs).toISOString(), nowMs, timeZone),
                )}
          </Detail>
        </dl>
      </Sheet.Body>
    </>
  )
}
