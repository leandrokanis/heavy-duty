import type { Today } from '@/features/workout/today.types'
import type { WorkoutFlowState } from '@/features/workout/workout-flow'
import type { RecordWorkoutSetBody } from '@/features/workout/workout-set.types'

// A set waiting to go to the API; seq is the registration order.
export type PendingSet = {
  seq: number
  id: string
  workoutId: string
  body: RecordWorkoutSetBody
  queuedAt: number
}

// A set the API refused for a domain rule; the server wins, so it is never resent.
export type RejectedSet = {
  id: string
  workoutId: string
  body: RecordWorkoutSetBody
  code: string
  message: string
  rejectedAt: number
}

export type NewPendingSet = Pick<PendingSet, 'workoutId' | 'body' | 'queuedAt'>

export type RejectionReason = Pick<RejectedSet, 'code' | 'message' | 'rejectedAt'>

export type QueueContents = { pending: PendingSet[]; rejected: RejectedSet[] }

export type ActiveWorkoutRow = { key: 'current'; savedAtMs: number; state: WorkoutFlowState }

export type ProgramCacheRow = { key: 'today'; savedAtMs: number; today: Today }

// Where the queue persists; the queue keeps its own in-memory mirror on top of it.
export interface QueueStore {
  load(): Promise<QueueContents>
  // A body id already in the queue is a no-op that returns the stored set.
  add(set: NewPendingSet): Promise<PendingSet>
  remove(id: string): Promise<void>
  // Takes the set out of the pending list and records it as rejected, in one step.
  reject(id: string, reason: RejectionReason): Promise<void>
  clearRejected(): Promise<void>
}
