import { SECONDS_PER_REP } from './today.config.js'

type SuggestableDay = { letter: string; exercises: readonly unknown[] }

// Next letter with exercises after the last trained one, wrapping around; a letter
// that left the program counts as no last workout.
export function suggestLetter(
  days: readonly SuggestableDay[],
  lastLetter: string | null,
): string | null {
  const lastIndex = days.findIndex((day) => day.letter === lastLetter)
  for (let step = 1; step <= days.length; step += 1) {
    const day = days[(lastIndex + step) % days.length]
    if (day && day.exercises.length > 0) {
      return day.letter
    }
  }
  return null
}

type TimedExercise = {
  sets: number
  targetReps: number | null
  targetSeconds: number | null
  restSeconds: number
}

export function estimateDurationSeconds(exercises: readonly TimedExercise[]): number {
  return exercises.reduce((total, exercise) => {
    const workSeconds = exercise.targetSeconds ?? (exercise.targetReps ?? 0) * SECONDS_PER_REP
    return total + exercise.sets * (workSeconds + exercise.restSeconds)
  }, 0)
}
