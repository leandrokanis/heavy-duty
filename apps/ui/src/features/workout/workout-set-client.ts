import { SEND_TIMEOUT_MS } from './workout.config'
import type { RecordWorkoutSetBody, SendOutcome } from './workout-set.types'

const REJECTED_STATUSES: ReadonlySet<number> = new Set([400, 409, 422])
const DEFAULT_REJECTION_MESSAGE = 'A API recusou a série.'

// A timer of the page, not AbortSignal.timeout, so the rest tests drive it with fake timers.
// Only a domain refusal (400, 409, 422) leaves the queue unsent; every other failure is retried.
export async function postWorkoutSet(
  workoutId: string,
  body: RecordWorkoutSetBody,
): Promise<SendOutcome> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
  try {
    const response = await fetch(`/api/workouts/${workoutId}/sets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
      signal: controller.signal,
    })
    if (response.status === 200 || response.status === 201) return { status: 'confirmed' }
    if (REJECTED_STATUSES.has(response.status)) return await rejectionOf(response)
    return { status: 'retry' }
  } catch {
    return { status: 'retry' }
  } finally {
    clearTimeout(timer)
  }
}

async function rejectionOf(response: Response): Promise<SendOutcome> {
  try {
    const body = (await response.json()) as { code?: unknown; message?: unknown }
    if (typeof body.code === 'string' && typeof body.message === 'string') {
      return { status: 'rejected', code: body.code, message: body.message }
    }
  } catch {
    // A body that is not JSON falls through to the default refusal.
  }
  return { status: 'rejected', code: 'unknown', message: DEFAULT_REJECTION_MESSAGE }
}
