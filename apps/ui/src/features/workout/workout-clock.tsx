'use client'

import { useEffect, useRef, useState } from 'react'
import { formatElapsedClock } from './format'
import { TICK_MS } from './workout.config'

const MS_PER_SECOND = 1000

export type WorkoutClockProps = {
  // The tap on "Começar".
  startedAtMs: number
  // The end of the workout; null while it runs.
  endedAtMs: number | null
}

function secondsSince(startedAtMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - startedAtMs) / MS_PER_SECOND))
}

// The total time of the workout, with its own clock: only this text renders each second, not the
// workout screen. A tick inside the second already shown sets no state, so it renders nothing.
export function WorkoutClock({ startedAtMs, endedAtMs }: WorkoutClockProps) {
  const [seconds, setSeconds] = useState(() => secondsSince(startedAtMs, endedAtMs ?? Date.now()))
  const shown = useRef(seconds)
  useEffect(() => {
    const show = (nowMs: number) => {
      const next = secondsSince(startedAtMs, nowMs)
      if (next === shown.current) return
      shown.current = next
      setSeconds(next)
    }
    if (endedAtMs !== null) {
      show(endedAtMs)
      return
    }
    const check = () => show(Date.now())
    check()
    const interval = setInterval(check, TICK_MS)
    return () => clearInterval(interval)
  }, [startedAtMs, endedAtMs])
  return (
    <span
      role="timer"
      aria-label="Tempo total"
      className="shrink-0 font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-subheadline) tabular-nums"
    >
      {formatElapsedClock(seconds * MS_PER_SECOND)}
    </span>
  )
}
