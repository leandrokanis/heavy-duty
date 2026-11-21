import { SUPINO_RETO } from '@/features/workout/test-today'
import type { RecordWorkoutSetBody } from '@/features/workout/workout-set.types'

// A set of supino-reto with the values of the fixtures; override what the case needs.
export function pendingSetBody(
  overrides: Partial<RecordWorkoutSetBody> = {},
): RecordWorkoutSetBody {
  return {
    id: '0193a1b2-0000-7000-8000-000000000501',
    workout: { programId: 'program-1', letter: 'A', startedAt: '2026-11-21T18:30:00.000Z' },
    plannedExerciseId: SUPINO_RETO.plannedExerciseId,
    exerciseId: SUPINO_RETO.exercise.id,
    setNumber: 1,
    loadG: SUPINO_RETO.loadG,
    reps: SUPINO_RETO.targetReps as number,
    performedAt: '2026-11-21T18:31:05.000Z',
    ...overrides,
  }
}
