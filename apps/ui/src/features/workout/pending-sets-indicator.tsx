'use client'

import { CloudOff } from 'lucide-react'
import { useSyncSnapshot } from '@/sync/sync-context'

export function pendingSetsLabel(count: number): string {
  return count === 1 ? '1 série aguardando envio' : `${count} séries aguardando envio`
}

// Quiet by design: no button, because the queue sends by itself (FR-004, FR-007).
export function PendingSetsIndicator() {
  const { pending } = useSyncSnapshot()
  if (pending.length === 0) return null
  const label = pendingSetsLabel(pending.length)
  return (
    <div
      role="status"
      aria-label={label}
      className="flex items-center gap-(--space-12) text-[var(--color-warning,currentColor)]"
    >
      <CloudOff aria-hidden="true" className="size-[20px]" />
      <span className="text-[0.9375rem]">{label}</span>
    </div>
  )
}
