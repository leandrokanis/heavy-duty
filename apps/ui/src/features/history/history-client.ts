import { SEND_TIMEOUT_MS } from '@/features/workout/workout.config'
import type { HistoryWorkout } from './history.types'

export type HistoryRange = { fromMs: number; toMs: number }

export type HistoryResult =
  | { status: 'ok'; workouts: HistoryWorkout[] }
  | { status: 'unauthenticated' }
  | { status: 'offline' }

const WORKOUTS_PATH = '/api/workouts'

// The API answers the workouts that started in [from, to), oldest first.
export async function fetchWorkoutHistory({ fromMs, toMs }: HistoryRange): Promise<HistoryResult> {
  const query = new URLSearchParams({
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
  })
  try {
    const response = await fetch(`${WORKOUTS_PATH}?${query}`, { credentials: 'same-origin' })
    if (response.status === 200) {
      const body = (await response.json()) as { workouts: HistoryWorkout[] }
      return { status: 'ok', workouts: body.workouts }
    }
    if (response.status === 401) return { status: 'unauthenticated' }
    return { status: 'offline' }
  } catch {
    return { status: 'offline' }
  }
}

export type DeleteResult =
  | { status: 'deleted' }
  | { status: 'unauthenticated' }
  | { status: 'failed' }

// A direct call, not the queue: the history needs a connection anyway (ADR-032). A 404 is done too,
// as no workout with the id is left.
export async function deleteHistoryWorkout(workoutId: string): Promise<DeleteResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
  try {
    const response = await fetch(`${WORKOUTS_PATH}/${workoutId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      signal: controller.signal,
    })
    if ([200, 204, 404].includes(response.status)) return { status: 'deleted' }
    if (response.status === 401) return { status: 'unauthenticated' }
    return { status: 'failed' }
  } catch {
    return { status: 'failed' }
  } finally {
    clearTimeout(timer)
  }
}
