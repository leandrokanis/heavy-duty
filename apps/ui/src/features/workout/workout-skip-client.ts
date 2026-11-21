import { postWithOutcome } from './post-with-outcome'
import type { SendOutcome } from './workout-set.types'
import type { RecordWorkoutSkipBody } from './workout-skip.types'

// The 404 refuses here, as for the finish: the sets go first, so a workout still missing means none was accepted (ADR-023).
const REJECTED_STATUSES: ReadonlySet<number> = new Set([400, 404, 409, 422])

export function postWorkoutSkip(
  workoutId: string,
  body: RecordWorkoutSkipBody,
): Promise<SendOutcome> {
  return postWithOutcome({
    path: `/api/workouts/${workoutId}/skips`,
    body,
    rejectedStatuses: REJECTED_STATUSES,
    defaultRejectionMessage: 'A API recusou o exercício pulado.',
  })
}
