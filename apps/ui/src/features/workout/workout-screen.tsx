'use client'

import { Progress } from '@base-ui/react/progress'
import { formatLoadKg } from './format'
import type { TodayDay, TodayExercise } from './today.types'

export type WorkoutScreenProps = {
  day: TodayDay
}

type Measure = { value: string; unit: string }

function targetOf(planned: TodayExercise): Measure {
  if (planned.exercise.kind === 'time') return { value: String(planned.targetSeconds), unit: 's' }
  return { value: String(planned.targetReps), unit: 'rep' }
}

function MeasureValue({ label, measure }: { label: string; measure: Measure }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a read-only value is not a form, so no fieldset.
    <div role="group" aria-label={label} className="flex items-baseline gap-(--space-8)">
      <span className="text-[5rem] leading-none font-(--font-weight-semibold) tabular-nums">
        {measure.value}
      </span>
      <span className="text-[1.25rem] font-(--font-weight-regular) opacity-60">{measure.unit}</span>
    </div>
  )
}

// Shows the first exercise and its first set; recording and moving on come with US-F03-02.
export function WorkoutScreen({ day }: WorkoutScreenProps) {
  const exerciseNumber = 1
  const setNumber = 1
  const planned = day.exercises[exerciseNumber - 1] as TodayExercise
  return (
    <main className="flex min-h-dvh flex-col gap-(--space-32) px-(--space-margin-inline) py-(--space-24)">
      <div className="glass flex min-h-(--target-workout) items-center gap-(--space-16) rounded-(--radius-capsule) px-(--space-20)">
        <span className="text-[1.25rem] font-(--font-weight-semibold)">{day.letter}</span>
        <Progress.Root
          aria-label="Exercícios"
          className="flex-1"
          getAriaValueText={() => `${exerciseNumber} de ${day.exercises.length}`}
          max={day.exercises.length}
          value={exerciseNumber}
        >
          <Progress.Track className="h-[6px] overflow-hidden rounded-(--radius-capsule) bg-[color-mix(in_srgb,CanvasText_15%,transparent)]">
            <Progress.Indicator className="bg-[CanvasText]" />
          </Progress.Track>
        </Progress.Root>
      </div>
      <h1 className="text-[1.75rem] font-(--font-weight-semibold)">{planned.exercise.name}</h1>
      <Progress.Root
        aria-label="Séries"
        getAriaValueText={() => `${setNumber} de ${planned.sets}`}
        max={planned.sets}
        value={setNumber}
      >
        <div aria-hidden="true" className="flex gap-(--space-8)">
          {Array.from({ length: planned.sets }, (_, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: the dots are positions, not items
              key={index}
              className={`size-[10px] rounded-(--radius-circle) ${
                index < setNumber
                  ? 'bg-[CanvasText]'
                  : 'bg-[color-mix(in_srgb,CanvasText_20%,transparent)]'
              }`}
            />
          ))}
        </div>
      </Progress.Root>
      <div className="flex flex-col gap-(--space-24)">
        <MeasureValue label="Carga" measure={{ value: formatLoadKg(planned.loadG), unit: 'kg' }} />
        <MeasureValue label="Alvo" measure={targetOf(planned)} />
      </div>
    </main>
  )
}
