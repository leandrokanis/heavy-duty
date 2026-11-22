import { postWithOutcome } from './post-with-outcome'
import type { SendOutcome } from './workout-set.types'
import type { CorrectWorkoutSetBody } from './workout-set-correction.types'

// Same refusals as the skip (ADR-023): the sets go first, so a 404 means the API never accepted the set.
const REJECTED_STATUSES: ReadonlySet<number> = new Set([400, 404, 409, 422])

export function patchWorkoutSet(
  workoutId: string,
  setId: string,
  body: CorrectWorkoutSetBody,
): Promise<SendOutcome> {
  return postWithOutcome({
    method: 'PATCH',
    path: `/api/workouts/${workoutId}/sets/${setId}`,
    body,
    rejectedStatuses: REJECTED_STATUSES,
    defaultRejectionMessage: 'A API recusou a correção da série.',
  })
}
