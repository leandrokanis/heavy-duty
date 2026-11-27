import { BodyFigure } from '@/features/body-map/body-figure'
import type { BodyMapGroup } from '@/features/body-map/body-map'
import { capitalized } from '@/features/body-map/group-parts'
import { LevelBadge } from '@/features/workout/level-badge'
import type { PeriodListItem, PeriodSnapshot } from './period.types'
import { formatPeriodDays } from './period-format'

// Every group of the snapshot counts on the reduced map: the program at the end is not frozen.
function figureGroupsOf(snapshot: PeriodSnapshot): BodyMapGroup[] {
  return snapshot.groups.map(({ muscleGroup, windowState }) => ({
    ...muscleGroup,
    state: windowState,
    inProgram: true,
    opensAtMs: null,
    closesAtMs: null,
    lastTrainedAtMs: null,
    level: null,
  }))
}

const weeksText = (weeks: number) =>
  `${weeks} ${weeks === 1 ? 'semana seguida' : 'semanas seguidas'}`

export type SnapshotCardProps = {
  period: PeriodListItem & { snapshot: PeriodSnapshot }
  // The device time zone when absent.
  timeZone?: string
}

// The snapshot frozen at the end of a period (US-F11-02, D99): the map, the levels and the
// intention, with the windows, the points and the streak of weeks.
export function SnapshotCard({ period, timeZone }: SnapshotCardProps) {
  const { snapshot } = period
  const title = `Período ${period.number}`
  return (
    <article
      aria-label={title}
      className="flex min-w-0 flex-col gap-(--space-8) rounded-(--radius-card) bg-(--color-background-grouped) p-(--space-12)"
    >
      <h3 className="m-0 font-(--font-weight-bold) text-(length:--font-size-headline)">{title}</h3>
      <p className="m-0 text-(--color-label-secondary) text-(length:--font-size-footnote)">
        {formatPeriodDays(period.startsAt, period.endsAt, timeZone)}
      </p>
      <BodyFigure groups={figureGroupsOf(snapshot)} selectedSlug={null} className="max-h-[140px]" />
      {period.intention ? (
        <p className="m-0 font-(--font-weight-semibold) text-(length:--font-size-footnote)">
          {`“${period.intention}”`}
        </p>
      ) : (
        <p className="m-0 text-(--color-label-secondary) text-(length:--font-size-footnote)">
          Sem frase de intenção
        </p>
      )}
      <ul className="m-0 flex list-none flex-col gap-(--space-4) p-0 text-(length:--font-size-footnote) tabular-nums">
        <li>
          {snapshot.usedPercent === null
            ? 'Nenhuma janela terminou'
            : `${snapshot.usedPercent} % das janelas`}
        </li>
        <li>{`${snapshot.points} ${snapshot.points === 1 ? 'ponto' : 'pontos'}`}</li>
        <li>{weeksText(snapshot.weekStreak)}</li>
      </ul>
      <ul
        aria-label={`Níveis no fim do período ${period.number}`}
        className="m-0 flex list-none flex-col gap-(--space-4) p-0 text-(length:--font-size-footnote)"
      >
        {snapshot.groups.map(({ muscleGroup, level, tier, windowState }) => (
          <li key={muscleGroup.slug} className="flex items-center justify-between gap-(--space-8)">
            <span className="min-w-0 truncate">{capitalized(muscleGroup.name)}</span>
            <LevelBadge level={level} tier={tier} size={24} cold={windowState === 'cooling'} />
          </li>
        ))}
      </ul>
    </article>
  )
}
