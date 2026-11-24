import type { MuscleGroupLevels } from '@/features/workout/levels.types'
import type { Today } from '@/features/workout/today.types'
import type { WeekWindows } from '@/features/workout/weekly-windows.types'
import type { ActivityWindows } from '@/features/workout/windows.types'
import type { FinishWorkoutBody } from '@/features/workout/workout-finish.types'
import type { WorkoutFlowState } from '@/features/workout/workout-flow'
import type { RecordWorkoutSetBody } from '@/features/workout/workout-set.types'
import type { CorrectWorkoutSetBody } from '@/features/workout/workout-set-correction.types'
import type { RecordWorkoutSkipBody } from '@/features/workout/workout-skip.types'

// A set waiting to go to the API; seq is the registration order. A row written before the
// finish existed has no kind and reads as a set.
export type PendingSet = {
  kind: 'set'
  seq: number
  id: string
  workoutId: string
  body: RecordWorkoutSetBody
  queuedAt: number
}

// The end of a workout, queued after its sets; the id is `${workoutId}:finish` (ADR-022).
export type PendingFinish = {
  kind: 'finish'
  seq: number
  id: string
  workoutId: string
  body: FinishWorkoutBody
  queuedAt: number
}

// An exercise left out of the workout, queued after the sets and before the finish; the id is
// `${workoutId}:skip:${plannedExerciseId}` (ADR-023).
export type PendingSkip = {
  kind: 'skip'
  seq: number
  id: string
  workoutId: string
  body: RecordWorkoutSkipBody
  queuedAt: number
}

// New values for a set already queued or sent, queued after it; the id is
// `${workoutId}:correction:${setId}`, so a newer correction replaces the pending one (ADR-025).
export type PendingCorrection = {
  kind: 'correction'
  seq: number
  id: string
  workoutId: string
  setId: string
  body: CorrectWorkoutSetBody
  queuedAt: number
}

// The removal of a discarded workout, queued after every item of it left the queue; the id is
// `${workoutId}:discard` and it has no body (ADR-032).
export type PendingDiscard = {
  kind: 'discard'
  seq: number
  id: string
  workoutId: string
  body?: undefined
  queuedAt: number
}

export type PendingItem =
  | PendingSet
  | PendingFinish
  | PendingSkip
  | PendingCorrection
  | PendingDiscard

// A set the API refused for a domain rule; the server wins, so it is never resent.
export type RejectedSet = {
  id: string
  workoutId: string
  body: RecordWorkoutSetBody
  code: string
  message: string
  rejectedAt: number
}

export type NewPendingItem =
  | Pick<PendingSet, 'kind' | 'workoutId' | 'body' | 'queuedAt'>
  | Pick<PendingFinish, 'kind' | 'workoutId' | 'body' | 'queuedAt'>
  | Pick<PendingSkip, 'kind' | 'workoutId' | 'body' | 'queuedAt'>
  | Pick<PendingCorrection, 'kind' | 'workoutId' | 'setId' | 'body' | 'queuedAt'>
  | NewPendingDiscard

export type NewPendingDiscard = Pick<PendingDiscard, 'kind' | 'workoutId' | 'queuedAt'>

export type RejectionReason = Pick<RejectedSet, 'code' | 'message' | 'rejectedAt'>

export type QueueContents = { pending: PendingItem[]; rejected: RejectedSet[] }

export type ActiveWorkoutRow = { key: 'current'; savedAtMs: number; state: WorkoutFlowState }

export type ProgramCacheRow =
  | { key: 'today'; savedAtMs: number; today: Today }
  | { key: 'windows'; savedAtMs: number; windows: ActivityWindows }
  | { key: 'levels'; savedAtMs: number; levels: MuscleGroupLevels }
  | { key: 'weekWindows'; savedAtMs: number; week: WeekWindows }

// Where the queue persists; the queue keeps its own in-memory mirror on top of it.
export interface QueueStore {
  load(): Promise<QueueContents>
  // An item id already in the queue is a no-op that returns the stored item.
  add(item: NewPendingItem): Promise<PendingItem>
  // Takes the stored item with the same id out and adds this one at the end of the order.
  replace(item: NewPendingItem): Promise<PendingItem>
  remove(id: string): Promise<void>
  // Takes every item of the workout out and adds the discard at the end, in one step (ADR-032).
  discardWorkout(item: NewPendingDiscard): Promise<PendingItem>
  // Takes the set out of the pending list and records it as rejected, in one step.
  reject(id: string, reason: RejectionReason): Promise<void>
  clearRejected(): Promise<void>
}
