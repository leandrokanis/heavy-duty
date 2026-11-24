import { Pencil } from 'lucide-react'
import type { Ref } from 'react'
import { MotionButton } from '@/components/ui/motion-button'
import { formatSetShort } from './format'
import { RecordBadge } from './record-badge'
import { setValuesText } from './workout-flow'
import type { RecordWorkoutSetBody } from './workout-set.types'

export type LastSetButtonProps = {
  set: Pick<RecordWorkoutSetBody, 'loadG' | 'reps' | 'seconds'>
  // The set beat a personal record (F18); the correction redoes it.
  record?: boolean
  onOpen: () => void
  // The focus comes back here when the correction sheet closes.
  ref?: Ref<HTMLButtonElement>
}

// The last recorded set as a button: the values are the only text, the name says what a tap does.
export function LastSetButton({ set, record = false, onOpen, ref }: LastSetButtonProps) {
  return (
    <MotionButton
      ref={ref}
      tapScale={1}
      aria-label={`Corrigir última série: ${setValuesText(set)}${record ? ', recorde' : ''}`}
      data-record={record ? '' : undefined}
      className="inline-flex min-h-(--target-workout) cursor-pointer select-none items-center justify-center rounded-(--radius-capsule) bg-(--color-background-grouped) pr-(--space-16) pl-(--space-20) font-(--font-weight-bold) text-(--color-label) text-(length:--font-size-title-3) tabular-nums transition-colors duration-(--duration-fast) data-pressed:bg-(--color-fill-strong) data-record:shadow-[0_0_0_2px_var(--color-game-record)]"
      onClick={onOpen}
    >
      {formatSetShort(set)}
      {record ? <RecordBadge className="ml-(--space-8)" /> : null}
      <Pencil
        aria-hidden="true"
        size={20}
        className="ml-(--space-12) shrink-0 text-(--color-label-secondary)"
      />
    </MotionButton>
  )
}
