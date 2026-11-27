import { CalendarDays } from 'lucide-react'
import type { PeriodListItem, PeriodSnapshot } from './period.types'
import { SnapshotCard } from './snapshot-card'

export type SnapshotListProps = {
  periods: PeriodListItem[]
  // The device time zone when absent.
  timeZone?: string
}

const isFrozen = (
  period: PeriodListItem,
): period is PeriodListItem & { snapshot: PeriodSnapshot } => period.snapshot !== null

// The collection of snapshots, side by side, the most recent first (US-F11-02).
export function SnapshotList({ periods, timeZone }: SnapshotListProps) {
  const frozen = periods.filter(isFrozen)
  if (frozen.length === 0) {
    return (
      <div className="flex flex-col items-center gap-(--space-4) rounded-(--radius-card) bg-(--color-background-grouped) p-(--space-16) text-center">
        <CalendarDays aria-hidden="true" size={24} className="text-(--color-label-secondary)" />
        <p className="m-0 font-(--font-weight-semibold)">Nenhum retrato ainda</p>
        <p className="m-0 text-(--color-label-secondary) text-(length:--font-size-footnote)">
          O retrato do período aparece no fim da semana 12.
        </p>
      </div>
    )
  }
  return (
    <ul aria-label="Retratos" className="m-0 grid list-none grid-cols-2 gap-(--space-12) p-0">
      {frozen.map((period) => (
        <li key={period.number} className="min-w-0">
          <SnapshotCard period={period} timeZone={timeZone} />
        </li>
      ))}
    </ul>
  )
}
