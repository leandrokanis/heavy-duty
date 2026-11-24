import { useId } from 'react'
import { LetterBadge } from '@/features/workout/letter-badge'
import { RecordedSetItem } from '@/features/workout/recorded-set-item'
import type { HistoryWorkout } from './history.types'
import { formatWorkoutDateTime, workoutMinutesOf } from './history-format'
import { labelOf } from './history-list'

export type WorkoutDetailProps = {
  workout: HistoryWorkout
  nowMs: number
  timeZone?: string
}

const SECTION_TITLE =
  'm-0 px-(--space-4) font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-footnote) uppercase tracking-(--font-tracking-caps)'

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function summaryOf(workout: HistoryWorkout): string[] {
  const minutes = workoutMinutesOf(workout)
  const sets = workout.exercises.reduce((total, { sets }) => total + sets.length, 0)
  return [
    ...(minutes === null ? [] : [`${minutes} min`]),
    plural(workout.exercises.length, 'exercício', 'exercícios'),
    plural(sets, 'série', 'séries'),
    ...(workout.endReason === 'ended_early' ? ['Encerrado antes'] : []),
  ]
}

// Read only (D50): the sets are list items, not controls; editing stays with the MCP.
export function WorkoutDetail({ workout, nowMs, timeZone }: WorkoutDetailProps) {
  const exercisesTitleId = useId()
  const leftOutTitleId = useId()
  return (
    <div className="flex flex-col gap-(--space-24)">
      <header className="flex flex-col gap-(--space-16)">
        <div className="flex items-center gap-(--space-16)">
          <span aria-hidden="true">
            <LetterBadge letter={workout.letter} size={44} />
          </span>
          <div className="flex min-w-0 flex-col gap-(--space-4)">
            <h1
              tabIndex={-1}
              className="m-0 break-words outline-none font-(--font-weight-bold) text-(length:--font-size-title-1) leading-(--font-leading-title-1) tracking-(--font-tracking-title-1)"
            >
              {labelOf(workout)}
            </h1>
            <p className="m-0 text-(--color-label-secondary) text-(length:--font-size-callout)">
              {`${workout.label === null ? '' : `Letra ${workout.letter} · `}${formatWorkoutDateTime(workout.startedAt, nowMs, timeZone)}`}
            </p>
          </div>
        </div>
        <ul aria-label="Resumo" className="m-0 flex list-none flex-wrap gap-(--space-8) p-0">
          {summaryOf(workout).map((fact) => (
            <li
              key={fact}
              className="rounded-(--radius-capsule) bg-(--color-fill) px-(--space-12) py-(--space-4) font-(--font-weight-semibold) text-(length:--font-size-footnote) tabular-nums"
            >
              {fact}
            </li>
          ))}
        </ul>
      </header>
      <section aria-labelledby={exercisesTitleId} className="flex flex-col gap-(--space-8)">
        <h2 id={exercisesTitleId} className={SECTION_TITLE}>
          Exercícios
        </h2>
        <ul className="m-0 flex list-none flex-col rounded-(--radius-card) bg-(--color-background-grouped) px-(--space-16) py-(--space-4)">
          {workout.exercises.map(({ exercise, sets }, index) => (
            <li
              key={exercise.id}
              className={`flex flex-col gap-(--space-8) py-(--space-12) ${index > 0 ? 'border-(--color-separator) border-t' : ''}`}
            >
              <h3 className="m-0 break-words font-(--font-weight-bold) text-(length:--font-size-body)">
                {exercise.name}
              </h3>
              <ul
                aria-label={`Séries de ${exercise.name}`}
                className="m-0 flex list-none flex-wrap gap-(--space-8) p-0"
              >
                {sets.map((set) => (
                  <RecordedSetItem key={set.id} set={set} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
      {workout.leftOut.length > 0 ? (
        <section aria-labelledby={leftOutTitleId} className="flex flex-col gap-(--space-8)">
          <h2 id={leftOutTitleId} className={SECTION_TITLE}>
            Ficaram de fora
          </h2>
          <ul className="m-0 flex list-none flex-col rounded-(--radius-card) bg-(--color-background-grouped) px-(--space-16) py-(--space-4)">
            {workout.leftOut.map((exercise, index) => (
              <li
                key={exercise.id}
                className={`py-(--space-12) font-(--font-weight-semibold) text-(--color-label) ${index > 0 ? 'border-(--color-separator) border-t' : ''}`}
              >
                {exercise.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
