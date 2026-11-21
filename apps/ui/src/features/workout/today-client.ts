import type { Today } from './today.types'

export type TodayResult =
  | { status: 'ok'; today: Today }
  | { status: 'unauthenticated' }
  | { status: 'offline' }

const TODAY_PATH = '/api/today'

export async function fetchToday(): Promise<TodayResult> {
  try {
    const response = await fetch(TODAY_PATH, { credentials: 'same-origin' })
    if (response.status === 200) return { status: 'ok', today: (await response.json()) as Today }
    if (response.status === 401) return { status: 'unauthenticated' }
    return { status: 'offline' }
  } catch {
    return { status: 'offline' }
  }
}
