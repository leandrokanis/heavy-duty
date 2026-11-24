import { Sparkle } from 'lucide-react'
import { formatLoadKg } from './format'
import type { RecordMark as RecordMarkValue } from './personal-records'

export type RecordMarkProps = { mark: RecordMarkValue }

function spokenOf({ loadG, passed }: RecordMarkValue): string {
  if (loadG === null) return 'Acima do recorde de repetições com esta carga'
  return passed
    ? `Acima do recorde de ${formatLoadKg(loadG)} kg`
    : `Recorde: ${formatLoadKg(loadG)} kg`
}

// The record beside the load (F18). It lights up with the record color and a filled icon when the
// values on screen beat a record; it shows the record, never a load to aim for.
export function RecordMark({ mark }: RecordMarkProps) {
  return (
    <span
      data-passed={mark.passed ? '' : undefined}
      className="inline-flex items-center gap-(--space-4) rounded-(--radius-capsule) bg-(--color-fill) py-px leading-none pr-(--space-8) pl-(--space-4) font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-footnote) tabular-nums transition-colors duration-(--duration-medium) data-passed:bg-(--color-game-record) data-passed:text-(--color-on-game-record) motion-safe:data-passed:animate-[record-pop_var(--duration-base)_ease-out]"
    >
      <span aria-hidden="true" className="inline-flex items-center gap-(--space-4)">
        <Sparkle size={14} fill={mark.passed ? 'currentColor' : 'none'} className="shrink-0" />
        {mark.loadG === null ? 'Recorde' : formatLoadKg(mark.loadG)}
      </span>
      <span className="sr-only">{spokenOf(mark)}</span>
    </span>
  )
}
