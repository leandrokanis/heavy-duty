import { postWithOutcome } from './post-with-outcome'
import type { SendOutcome } from './workout-set.types'

// A 404 is done too: the workout may never have reached the server, and none with the id is left (ADR-032).
const CONFIRMED_STATUSES: ReadonlySet<number> = new Set([200, 204, 404])
const REJECTED_STATUSES: ReadonlySet<number> = new Set([400, 409, 422])

export function deleteWorkout(workoutId: string): Promise<SendOutcome> {
  return postWithOutcome({
    method: 'DELETE',
    path: `/api/workouts/${workoutId}`,
    confirmedStatuses: CONFIRMED_STATUSES,
    rejectedStatuses: REJECTED_STATUSES,
    defaultRejectionMessage: 'A API recusou a remoção do treino.',
  })
}
