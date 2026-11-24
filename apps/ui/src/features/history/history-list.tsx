import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { LetterBadge } from '@/features/workout/letter-badge'
import type { HistoryWorkout } from './history.types'
import { formatWorkoutDate, workoutMinutesOf } from './history-format'
import { workoutDetailHref } from './history-paths'

export type HistoryListProps = {
  workouts: HistoryWorkout[]
  nowMs: number
  timeZone?: string
}

// The divider starts where the name starts: row padding (16) + badge (44) + gap (16).
const DIVIDER_LEFT = 'left-[76px]'

export function labelOf(workout: Pick<HistoryWorkout, 'letter' | 'label'>): string {
  return workout.label ?? `Letra ${workout.letter}`
}

function metaOf(workout: HistoryWorkout, nowMs: number, timeZone?: string): string[] {
  const minutes = workoutMinutesOf(workout)
  return [
    formatWorkoutDate(workout.startedAt, nowMs, timeZone),
    ...(minutes === null ? [] : [`${minutes} min`]),
    ...(workout.endReason === 'ended_early' ? ['Encerrado antes'] : []),
  ]
}

export function HistoryList({ workouts, nowMs, timeZone }: HistoryListProps) {
  return (
    <ul
      aria-label="Treinos"
      className="m-0 flex list-none flex-col overflow-hidden rounded-(--radius-card) bg-(--color-background-grouped) p-0"
    >
      {workouts.map((workout, index) => (
        <li key={workout.id} className="relative">
          {index > 0 ? (
            <span
              aria-hidden="true"
              className={`absolute top-0 right-0 h-px bg-(--color-separator) ${DIVIDER_LEFT}`}
            />
          ) : null}
          <Link
            href={workoutDetailHref(workout.id)}
            className="flex min-h-[72px] w-full select-none items-center gap-(--space-16) px-(--space-16) py-(--space-12) text-(--color-label) no-underline transition-colors duration-(--duration-fast) active:bg-(--color-fill)"
          >
            <LetterBadge letter={workout.letter} size={44} />
            <span className="flex min-w-0 flex-1 flex-col gap-(--space-4)">
              <span className="truncate font-(--font-weight-semibold) text-(length:--font-size-headline)">
                {labelOf(workout)}
              </span>
              <span className="flex flex-wrap gap-x-(--space-8) text-(--color-label-secondary) text-(length:--font-size-subheadline) tabular-nums">
                {metaOf(workout, nowMs, timeZone).map((part) => (
                  <span key={part} className="whitespace-nowrap">
                    {part}
                  </span>
                ))}
              </span>
            </span>
            <ChevronRight
              aria-hidden="true"
              size={22}
              className="shrink-0 text-(--color-label-secondary)"
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}
