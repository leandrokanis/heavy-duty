// Mirror of TodaySchema in apps/api/src/modules/workouts/workouts.schemas.ts.
export type ExerciseKind = 'reps' | 'time'

export type LoadSource = 'program' | 'last_workout'

export type MuscleGroupRef = { slug: string; name: string }

export type PersonalRecord = { reps: number; loadG: number }

export type TodayExercise = {
  plannedExerciseId: string
  exercise: { id: string; slug: string; name: string; kind: ExerciseKind }
  sets: number
  targetReps: number | null
  targetSeconds: number | null
  restSeconds: number
  plannedLoadG: number
  loadG: number
  loadSource: LoadSource
  muscleGroups: MuscleGroupRef[]
  records: PersonalRecord[]
  // Absent from a copy of the workout of the day saved on the device before US-F10-02.
  secondaryMuscleGroups?: MuscleGroupRef[]
}

export type TodayDay = {
  letter: string
  label: string | null
  estimatedDurationSeconds: number
  exercises: TodayExercise[]
}

export type Today = {
  program: { id: string; name: string; goal: string } | null
  suggestedLetter: string | null
  days: TodayDay[]
}
