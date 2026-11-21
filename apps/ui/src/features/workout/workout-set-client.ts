import { SEND_TIMEOUT_MS } from './workout.config'
import type { RecordWorkoutSetBody, SendResult } from './workout-set.types'

// A timer of the page, not AbortSignal.timeout, so the rest tests drive it with fake timers.
export async function postWorkoutSet(
  workoutId: string,
  body: RecordWorkoutSetBody,
): Promise<SendResult> {
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
    return response.status === 200 || response.status === 201 ? 'sent' : 'failed'
  } catch {
    return 'failed'
  } finally {
    clearTimeout(timer)
  }
}
