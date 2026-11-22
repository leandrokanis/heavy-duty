import { Progress } from '@base-ui/react/progress'
import { formatRestClock } from './format'

const MS_PER_SECOND = 1000
// The ring is 240 px with a 14 px stroke; the radius keeps the stroke inside the box.
const SIZE = 240
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Decorative ring: the track and, when a fraction is given, the part that is left.
// A null fraction draws the track alone, as the count of a timed exercise does.
export function RingSvg({ fractionLeft }: { fractionLeft: number | null }) {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 size-full -rotate-90"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        strokeWidth={STROKE}
        className="stroke-(--color-fill) contrast-more:stroke-(--color-fill-strong)"
      />
      {fractionLeft === null ? null : (
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fractionLeft)}
          className="stroke-current transition-[stroke-dashoffset] duration-(--duration-tick) ease-linear motion-reduce:transition-none"
        />
      )}
    </svg>
  )
}

export type TimerRingProps = {
  msLeft: number
  totalSeconds: number
  // The name of the progressbar, and the name of the timer that sits over it.
  progressLabel: string
  timerLabel: string
  // The warning tone marks the last seconds of an execution (FR-005).
  tone?: 'default' | 'warning'
  // The rest and the execution use different sizes for the time.
  size?: 'rest' | 'execution'
}

const TIME_CLASS = {
  rest: 'text-(length:--font-size-rest)',
  execution: 'text-(length:--font-size-execution)',
} as const

// The timer sits over the ring as a sibling: children of a progressbar are presentational in ARIA.
export function TimerRing({
  msLeft,
  totalSeconds,
  progressLabel,
  timerLabel,
  tone = 'default',
  size = 'rest',
}: TimerRingProps) {
  const secondsLeft = Math.ceil(msLeft / MS_PER_SECOND)
  const clock = formatRestClock(secondsLeft)
  const fractionLeft = msLeft / (totalSeconds * MS_PER_SECOND)
  return (
    <div
      data-tone={tone === 'warning' ? 'warning' : undefined}
      className="relative mx-auto grid size-[240px] shrink-0 place-items-center text-(--color-label) data-[tone=warning]:text-(--color-warning)"
    >
      <Progress.Root
        aria-label={progressLabel}
        className="absolute inset-0"
        getAriaValueText={() => clock}
        max={totalSeconds}
        value={secondsLeft}
      >
        <RingSvg fractionLeft={fractionLeft} />
      </Progress.Root>
      <div
        role="timer"
        aria-label={timerLabel}
        className={`relative font-(--font-weight-bold) leading-none tracking-(--font-tracking-tight) tabular-nums ${TIME_CLASS[size]}`}
      >
        {clock}
      </div>
    </div>
  )
}
