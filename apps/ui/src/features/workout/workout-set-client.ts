import { postWithOutcome } from './post-with-outcome'
import type { RecordWorkoutSetBody, SendOutcome } from './workout-set.types'

const REJECTED_STATUSES: ReadonlySet<number> = new Set([400, 409, 422])

// Only a domain refusal (400, 409, 422) leaves the queue unsent; every other failure is retried.
export function postWorkoutSet(
  workoutId: string,
  body: RecordWorkoutSetBody,
): Promise<SendOutcome> {
  return postWithOutcome({
    path: `/api/workouts/${workoutId}/sets`,
    body,
    rejectedStatuses: REJECTED_STATUSES,
    defaultRejectionMessage: 'A API recusou a série.',
  })
}
