'use client'

import { Clock } from 'lucide-react'
import { useSyncSnapshot } from '@/sync/sync-context'

export function pendingSetsLabel(count: number): string {
  return count === 1 ? '1 série aguardando envio' : `${count} séries aguardando envio`
}

// Quiet by design: no button, because the queue sends by itself (FR-004, FR-007).
export function PendingSetsIndicator() {
  const { pending } = useSyncSnapshot()
  // The finish waiting in the queue is not a set (FR-022).
  const setCount = pending.filter(({ kind }) => kind === 'set').length
  if (setCount === 0) return null
  const label = pendingSetsLabel(setCount)
  return (
    <div
      role="status"
      aria-label={label}
      className="inline-flex items-center gap-(--space-8) rounded-(--radius-capsule) bg-(--color-warning-soft) px-(--space-12) py-(--space-8) text-(--color-label)"
    >
      <Clock aria-hidden="true" size={18} className="shrink-0 text-(--color-warning)" />
      <span className="font-(--font-weight-semibold) text-(length:--font-size-subheadline)">
        {label}
      </span>
    </div>
  )
}
