import type { Medals } from './medals.types'

export type MedalsResult =
  | { status: 'ok'; medals: Medals }
  | { status: 'unauthenticated' }
  | { status: 'offline' }

const MEDALS_PATH = '/api/medals'

export async function fetchMedals(): Promise<MedalsResult> {
  try {
    const response = await fetch(MEDALS_PATH, { credentials: 'same-origin' })
    if (response.status === 200) {
      return { status: 'ok', medals: (await response.json()) as Medals }
    }
    if (response.status === 401) return { status: 'unauthenticated' }
    return { status: 'offline' }
  } catch {
    return { status: 'offline' }
  }
}
