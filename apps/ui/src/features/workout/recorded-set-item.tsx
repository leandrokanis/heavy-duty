import { formatLoadKg } from './format'
import { RecordBadge } from './record-badge'

export type RecordedSetItemProps = {
  set: {
    setNumber: number
    loadG: number
    reps?: number | null
    seconds?: number | null
    record?: boolean
  }
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

// The same set twice: the figures for the eye, the full sentence for the screen reader.
export function RecordedSetItem({ set }: RecordedSetItemProps) {
  const isTime = typeof set.seconds === 'number'
  const amount = isTime ? (set.seconds as number) : (set.reps ?? 0)
  const spoken = isTime
    ? plural(amount, 'segundo', 'segundos')
    : plural(amount, 'repetição', 'repetições')
  return (
    <li className="rounded-(--radius-capsule) bg-(--color-fill) px-(--space-12) py-(--space-4) font-(--font-weight-semibold) text-(length:--font-size-subheadline) tabular-nums">
      <span aria-hidden="true" className="flex items-baseline gap-(--space-8)">
        <span className="text-(--color-label-secondary)">{`Série ${set.setNumber}`}</span>
        <span>
          <span className="text-(--color-label)">{formatLoadKg(set.loadG)}</span>
          <span className="text-(--color-label-secondary)"> kg</span>
        </span>
        <span>
          <span className="text-(--color-label)">{amount}</span>
          <span className="text-(--color-label-secondary)">{isTime ? ' s' : ' rep'}</span>
        </span>
        {set.record ? <RecordBadge /> : null}
      </span>
      <span className="sr-only">{`Série ${set.setNumber}: ${formatLoadKg(set.loadG)} kg, ${spoken}${set.record ? ', recorde' : ''}`}</span>
    </li>
  )
}
