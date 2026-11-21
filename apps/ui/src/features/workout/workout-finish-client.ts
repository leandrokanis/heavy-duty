import { postWithOutcome } from './post-with-outcome'
import type { FinishWorkoutBody } from './workout-finish.types'
import type { SendOutcome } from './workout-set.types'

// The 404 refuses here, unlike a set: the sets go first, so a workout still missing means none was accepted (ADR-022).
const REJECTED_STATUSES: ReadonlySet<number> = new Set([400, 404, 409, 422])

export function postWorkoutFinish(
  workoutId: string,
  body: FinishWorkoutBody,
): Promise<SendOutcome> {
  return postWithOutcome({
    path: `/api/workouts/${workoutId}/finish`,
    body,
    rejectedStatuses: REJECTED_STATUSES,
    defaultRejectionMessage: 'A API recusou o fim do treino.',
  })
}
