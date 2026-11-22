import { Progress } from '@base-ui/react/progress'
import { formatRestClock } from './format'

const MS_PER_SECOND = 1000
const RADIUS = 46
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export type TimerRingProps = {
  msLeft: number
  totalSeconds: number
  // The name of the progressbar, and the name of the timer that sits over it.
  progressLabel: string
  timerLabel: string
  // The warning tone marks the last seconds of an execution (FR-005).
  tone?: 'default' | 'warning'
}

// The timer sits over the ring as a sibling: children of a progressbar are presentational in ARIA.
export function TimerRing({
  msLeft,
  totalSeconds,
  progressLabel,
  timerLabel,
  tone = 'default',
}: TimerRingProps) {
  const secondsLeft = Math.ceil(msLeft / MS_PER_SECOND)
  const clock = formatRestClock(secondsLeft)
  const fractionLeft = msLeft / (totalSeconds * MS_PER_SECOND)
  return (
    <div
      data-tone={tone === 'warning' ? 'warning' : undefined}
      className="relative mx-auto grid size-[min(72vw,280px)] place-items-center data-[tone=warning]:text-(--color-warning)"
    >
      <Progress.Root
        aria-label={progressLabel}
        className="absolute inset-0"
        getAriaValueText={() => clock}
        max={totalSeconds}
        value={secondsLeft}
      >
        <svg aria-hidden="true" className="size-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="6"
            className="stroke-[color-mix(in_srgb,CanvasText_15%,transparent)]"
          />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - fractionLeft)}
            className="stroke-current transition-[stroke-dashoffset] duration-250 ease-linear motion-reduce:transition-none"
          />
        </svg>
      </Progress.Root>
      <div
        role="timer"
        aria-label={timerLabel}
        className="relative text-[4rem] leading-none font-(--font-weight-semibold) tabular-nums"
      >
        {clock}
      </div>
    </div>
  )
}
