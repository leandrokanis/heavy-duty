import { Progress } from '@base-ui/react/progress'
import { formatRestClock } from './format'

const MS_PER_SECOND = 1000
const RADIUS = 46
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export type RestRingProps = { msLeft: number; restSeconds: number }

// The timer sits over the ring as a sibling: children of a progressbar are presentational in ARIA.
export function RestRing({ msLeft, restSeconds }: RestRingProps) {
  const secondsLeft = Math.ceil(msLeft / MS_PER_SECOND)
  const clock = formatRestClock(secondsLeft)
  const fractionLeft = msLeft / (restSeconds * MS_PER_SECOND)
  return (
    <div className="relative mx-auto grid size-[min(72vw,280px)] place-items-center">
      <Progress.Root
        aria-label="Descanso restante"
        className="absolute inset-0"
        getAriaValueText={() => clock}
        max={restSeconds}
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
            className="stroke-[CanvasText] transition-[stroke-dashoffset] duration-250 ease-linear motion-reduce:transition-none"
          />
        </svg>
      </Progress.Root>
      <div
        role="timer"
        aria-label="Descanso"
        className="relative text-[4rem] leading-none font-(--font-weight-semibold) tabular-nums"
      >
        {clock}
      </div>
    </div>
  )
}
