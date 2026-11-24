import type { HistoryExercise, HistoryWorkout } from './history.types'

export function historyExercise(
  name: string,
  sets: { loadG: number; reps?: number; seconds?: number }[],
): HistoryExercise {
  const slug = name.toLowerCase().replaceAll(' ', '-')
  return {
    exercise: { id: `exercise-${slug}`, slug, name, kind: sets[0]?.seconds ? 'time' : 'reps' },
    sets: sets.map((set, index) => ({
      id: `set-${slug}-${index + 1}`,
      setNumber: index + 1,
      loadG: set.loadG,
      reps: set.reps ?? null,
      seconds: set.seconds ?? null,
      performedAt: '2026-11-21T21:40:00.000Z',
      correctedAt: null,
    })),
  }
}

export function historyWorkout(overrides: Partial<HistoryWorkout> = {}): HistoryWorkout {
  return {
    id: 'workout-1',
    program: { id: 'program-1', name: 'Hipertrofia' },
    letter: 'A',
    label: 'Peito e tríceps',
    startedAt: '2026-11-21T21:30:00.000Z',
    finishedAt: '2026-11-21T22:22:00.000Z',
    endReason: 'completed',
    exercises: [],
    leftOut: [],
    ...overrides,
  }
}
