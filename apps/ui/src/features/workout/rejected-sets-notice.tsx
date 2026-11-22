'use client'

import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div
      role="alert"
      className="flex w-full items-start gap-(--space-12) rounded-(--radius-card) bg-(--color-background-grouped) px-(--space-16) py-(--space-12)"
    >
      <CircleAlert
        aria-hidden="true"
        size={22}
        strokeWidth={1.8}
        className="shrink-0 text-(--color-danger)"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-(--space-4)">
        <span className="font-(--font-weight-semibold) text-(--color-label) text-(length:--font-size-body)">
          {countText(rejected.length)}
        </span>
        {messages.map((message) => (
          <span
            key={message}
            className="text-(--color-label-secondary) text-(length:--font-size-subheadline)"
          >
            {message}
          </span>
        ))}
      </div>
      <Button
        variant="secondary"
        size="workout"
        className="shrink-0 self-center"
        onClick={() => void queue.dismissRejected()}
      >
        Dispensar
      </Button>
    </div>
  )
}
