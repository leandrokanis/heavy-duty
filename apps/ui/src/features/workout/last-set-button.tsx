import { Pencil } from 'lucide-react'
import type { Ref } from 'react'
import { MotionButton } from '@/components/ui/motion-button'
import { formatSetShort } from './format'
import { setValuesText } from './workout-flow'
import type { RecordWorkoutSetBody } from './workout-set.types'

export type LastSetButtonProps = {
  set: Pick<RecordWorkoutSetBody, 'loadG' | 'reps' | 'seconds'>
  onOpen: () => void
  // The focus comes back here when the correction sheet closes.
  ref?: Ref<HTMLButtonElement>
}

// The last recorded set as a button: the values are the only text, the name says what a tap does.
export function LastSetButton({ set, onOpen, ref }: LastSetButtonProps) {
  return (
    <MotionButton
      ref={ref}
      tapScale={1}
      aria-label={`Corrigir última série: ${setValuesText(set)}`}
      className="inline-flex min-h-(--target-workout) cursor-pointer select-none items-center justify-center rounded-(--radius-capsule) bg-(--color-background-grouped) pr-(--space-16) pl-(--space-20) font-(--font-weight-bold) text-(--color-label) text-(length:--font-size-title-3) tabular-nums transition-colors duration-(--duration-fast) data-pressed:bg-(--color-fill-strong)"
      onClick={onOpen}
    >
      {formatSetShort(set)}
      <Pencil
        aria-hidden="true"
        size={20}
        className="ml-(--space-12) shrink-0 text-(--color-label-secondary)"
      />
    </MotionButton>
  )
}
