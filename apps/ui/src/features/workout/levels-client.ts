import type { MuscleGroupLevels } from './levels.types'

export type LevelsResult =
  | { status: 'ok'; levels: MuscleGroupLevels }
  | { status: 'unauthenticated' }
  | { status: 'offline' }

const LEVELS_PATH = '/api/levels'

export async function fetchLevels(): Promise<LevelsResult> {
  try {
    const response = await fetch(LEVELS_PATH, { credentials: 'same-origin' })
    if (response.status === 200) {
      return { status: 'ok', levels: (await response.json()) as MuscleGroupLevels }
    }
    if (response.status === 401) return { status: 'unauthenticated' }
    return { status: 'offline' }
  } catch {
    return { status: 'offline' }
  }
}
