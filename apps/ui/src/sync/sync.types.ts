import type { Today } from '@/features/workout/today.types'
import type { FinishWorkoutBody } from '@/features/workout/workout-finish.types'
import type { WorkoutFlowState } from '@/features/workout/workout-flow'
import type { RecordWorkoutSetBody } from '@/features/workout/workout-set.types'
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

export type PendingItem = PendingSet | PendingFinish | PendingSkip

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

export type RejectionReason = Pick<RejectedSet, 'code' | 'message' | 'rejectedAt'>

export type QueueContents = { pending: PendingItem[]; rejected: RejectedSet[] }

export type ActiveWorkoutRow = { key: 'current'; savedAtMs: number; state: WorkoutFlowState }

export type ProgramCacheRow = { key: 'today'; savedAtMs: number; today: Today }

// Where the queue persists; the queue keeps its own in-memory mirror on top of it.
export interface QueueStore {
  load(): Promise<QueueContents>
  // An item id already in the queue is a no-op that returns the stored item.
  add(item: NewPendingItem): Promise<PendingItem>
  remove(id: string): Promise<void>
  // Takes the set out of the pending list and records it as rejected, in one step.
  reject(id: string, reason: RejectionReason): Promise<void>
  clearRejected(): Promise<void>
}
