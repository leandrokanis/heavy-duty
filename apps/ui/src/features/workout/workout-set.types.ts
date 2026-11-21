// Mirror of RecordWorkoutSetBodySchema and WorkoutSetSchema in apps/api/src/modules/workouts/workouts.schemas.ts.
export type RecordWorkoutSetBody = {
  id: string
  workout: { programId: string; letter: string; startedAt: string }
  plannedExerciseId: string
  exerciseId: string
  setNumber: number
  loadG: number
  reps?: number
  seconds?: number
  performedAt: string
}

export type SendResult = 'sent' | 'failed'
