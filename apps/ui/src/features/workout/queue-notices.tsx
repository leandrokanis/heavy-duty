import { PendingSetsIndicator } from './pending-sets-indicator'
import { RejectedSetsNotice } from './rejected-sets-notice'

export type QueueNoticesProps = {
  // start on the letters screen, center on the workout screens.
  align: 'start' | 'center'
  className?: string
}

// Both notices of the queue in the same order and spacing everywhere; empty, the group takes no space.
export function QueueNotices({ align, className }: QueueNoticesProps) {
  return (
    <div
      className={`flex flex-col gap-(--space-12) empty:hidden ${
        align === 'center' ? 'items-center' : 'items-start'
      }${className ? ` ${className}` : ''}`}
    >
      <RejectedSetsNotice />
      <PendingSetsIndicator />
    </div>
  )
}
