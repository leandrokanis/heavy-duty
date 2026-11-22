import { Button } from '@base-ui/react/button'
import type { Ref } from 'react'
import { formatLoadKg } from './format'
import { setValuesText } from './workout-flow'
import type { RecordWorkoutSetBody } from './workout-set.types'

export type LastSetButtonProps = {
  set: Pick<RecordWorkoutSetBody, 'loadG' | 'reps' | 'seconds'>
  onOpen: () => void
  // The focus comes back here when the correction sheet closes.
  ref?: Ref<HTMLButtonElement>
}

function measureLabel(set: LastSetButtonProps['set']): string {
  return set.reps === undefined ? `${set.seconds} s` : `${set.reps} rep`
}

// The last recorded set as a button: the values are the only text, the name says what a tap does.
export function LastSetButton({ set, onOpen, ref }: LastSetButtonProps) {
  return (
    <Button
      ref={ref}
      aria-label={`Corrigir última série: ${setValuesText(set)}`}
      className="min-h-(--target-workout) rounded-(--radius-capsule) bg-[color-mix(in_srgb,CanvasText_12%,transparent)] px-(--space-24) text-[1.0625rem] font-(--font-weight-semibold) tabular-nums active:opacity-60"
      onClick={onOpen}
    >
      {`${formatLoadKg(set.loadG)} kg · ${measureLabel(set)}`}
    </Button>
  )
}
