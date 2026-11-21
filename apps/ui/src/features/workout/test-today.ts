import type { Today, TodayDay, TodayExercise } from './today.types'

export const SUPINO_RETO: TodayExercise = {
  plannedExerciseId: 'planned-supino',
  exercise: { id: 'exercise-supino', slug: 'supino-reto', name: 'Supino reto', kind: 'reps' },
  sets: 3,
  targetReps: 10,
  targetSeconds: null,
  restSeconds: 90,
  plannedLoadG: 40000,
  loadG: 42500,
  loadSource: 'last_workout',
}

export const PRANCHA: TodayExercise = {
  plannedExerciseId: 'planned-prancha',
  exercise: { id: 'exercise-prancha', slug: 'prancha', name: 'Prancha', kind: 'time' },
  sets: 3,
  targetReps: null,
  targetSeconds: 45,
  restSeconds: 60,
  plannedLoadG: 0,
  loadG: 0,
  loadSource: 'program',
}

export function todayDay(
  letter: string,
  label: string | null,
  exercises: TodayExercise[],
  estimatedDurationSeconds = 675,
): TodayDay {
  return { letter, label, estimatedDurationSeconds, exercises }
}

// Active program 'Programa 1' with the given days; letter 'A' holds supino-reto and prancha by default.
export function todayBody(
  days: TodayDay[] = [todayDay('A', 'Superior', [SUPINO_RETO, PRANCHA])],
  suggestedLetter: string | null = 'A',
): Today {
  return {
    program: { id: 'program-1', name: 'Programa 1', goal: 'hypertrophy' },
    suggestedLetter,
    days,
  }
}

export const NO_PROGRAM: Today = { program: null, suggestedLetter: null, days: [] }
