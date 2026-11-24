import type { MuscleGroupLevels } from '@/features/workout/levels.types'
import { fetchLevels, type LevelsResult } from '@/features/workout/levels-client'
import { getLocalDb, type LocalDb } from './local-db'

const ROW_KEY = 'levels'

export type LoadedLevels =
  | LevelsResult
  | { status: 'ok'; levels: MuscleGroupLevels; fromCache: true }

let memoryLevels: MuscleGroupLevels | null = null

async function withDb<T>(use: (db: LocalDb) => Promise<T>): Promise<T | undefined> {
  try {
    const db = await getLocalDb()
    return db ? await use(db) : undefined
  } catch {
    return undefined
  }
}

async function readCachedLevels(): Promise<MuscleGroupLevels | null> {
  const row = await withDb((db) => db.programCache.get(ROW_KEY))
  return (row?.key === 'levels' ? row.levels : undefined) ?? memoryLevels
}

// A 200 refreshes the copy and a 401 deletes it; network, timeout and 5xx fall back to the copy.
export async function loadLevels(): Promise<LoadedLevels> {
  const result = await fetchLevels()
  if (result.status === 'ok') {
    memoryLevels = result.levels
    await withDb((db) =>
      db.programCache.put({ key: ROW_KEY, savedAtMs: Date.now(), levels: result.levels }),
    )
    return result
  }
  if (result.status === 'unauthenticated') {
    await clearCachedLevels()
    return result
  }
  const cached = await readCachedLevels()
  return cached ? { status: 'ok', levels: cached, fromCache: true } : result
}

export async function clearCachedLevels(): Promise<void> {
  memoryLevels = null
  await withDb((db) => db.programCache.delete(ROW_KEY))
}
