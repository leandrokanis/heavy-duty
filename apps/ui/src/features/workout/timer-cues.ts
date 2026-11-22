import type { TimerReading } from './workout-flow'

export type Cue = 'count' | 'start' | 'warning' | 'end'

const STALE_READING_MS = 1000
const LAST_WARNING_SECONDS = 3

// The cue for the change between two readings, or null. A reading more than a second after the
// previous one comes from a screen that was off, and a late sound would only confuse.
export function cueBetween(previous: TimerReading, current: TimerReading): Cue | null {
  if (current.atMs - previous.atMs > STALE_READING_MS) return null
  if (current.stage === 'countdown') {
    return previous.stage !== 'countdown' || previous.value !== current.value ? 'count' : null
  }
  if (current.stage === 'execution') {
    if (previous.stage === 'countdown') return 'start'
    const isNewSecond = previous.stage === 'execution' && previous.value !== current.value
    return isNewSecond && current.value >= 1 && current.value <= LAST_WARNING_SECONDS
      ? 'warning'
      : null
  }
  return previous.stage === 'execution' && current.lastStep === 'timerEnd' ? 'end' : null
}
