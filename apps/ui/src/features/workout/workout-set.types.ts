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

// What the API said about a sent set: gone from the queue, refused for a domain rule, or try again later.
export type SendOutcome =
  | { status: 'confirmed' }
  | { status: 'rejected'; code: string; message: string }
  | { status: 'retry' }
