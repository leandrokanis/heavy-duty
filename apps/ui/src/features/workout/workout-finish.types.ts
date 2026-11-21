// Mirror of FinishWorkoutBodySchema in apps/api/src/modules/workouts/workouts.schemas.ts.
export type WorkoutEndReason = 'completed' | 'ended_early'

export type FinishWorkoutBody = {
  finishedAt: string
  endReason: WorkoutEndReason
}
