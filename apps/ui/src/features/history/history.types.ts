// Mirror of the HistoryWorkout schema of GET /api/workouts (docs/arquitetura/openapi.json).
export type HistoryExerciseSummary = {
  id: string
  slug: string
  name: string
  kind: 'reps' | 'time'
}

export type HistorySet = {
  id: string
  setNumber: number
  loadG: number
  reps: number | null
  seconds: number | null
  performedAt: string
  correctedAt: string | null
}

export type HistoryExercise = {
  exercise: HistoryExerciseSummary
  sets: HistorySet[]
}

export type HistoryWorkout = {
  id: string
  program: { id: string; name: string }
  letter: string
  label: string | null
  startedAt: string
  finishedAt: string | null
  endReason: 'completed' | 'ended_early' | null
  exercises: HistoryExercise[]
  leftOut: HistoryExerciseSummary[]
}
