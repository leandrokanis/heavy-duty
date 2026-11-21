'use client'

import { Button } from '@base-ui/react/button'
import { TriangleAlert } from 'lucide-react'
import { useSyncQueue, useSyncSnapshot } from '@/sync/sync-context'

function countText(count: number): string {
  return count === 1 ? '1 série recusada pela API' : `${count} séries recusadas pela API`
}

// One notice for all refused sets: a removed exercise refuses several at once, and one tap clears them (FR-008).
export function RejectedSetsNotice() {
  const queue = useSyncQueue()
  const { rejected } = useSyncSnapshot()
  if (rejected.length === 0) return null
  const messages = [...new Set(rejected.map(({ message }) => message))]
  return (
    <div role="alert" className="flex items-start gap-(--space-12)">
      <TriangleAlert aria-hidden="true" className="mt-[2px] size-[20px] shrink-0" />
      <div className="flex flex-1 flex-col gap-(--space-4) text-[0.9375rem]">
        <span className="font-(--font-weight-semibold)">{countText(rejected.length)}</span>
        {messages.map((message) => (
          <span key={message} className="opacity-60">
            {message}
          </span>
        ))}
      </div>
      <Button
        className="min-h-(--target-min) rounded-(--radius-capsule) px-(--space-16) text-[1.0625rem] font-(--font-weight-semibold) active:opacity-60"
        onClick={() => void queue.dismissRejected()}
      >
        Dispensar
      </Button>
    </div>
  )
}
