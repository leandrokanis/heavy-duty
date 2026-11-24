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
