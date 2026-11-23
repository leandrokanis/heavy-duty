import type { ActivityWindows } from '@/features/workout/windows.types'
import { fetchWindows, type WindowsResult } from '@/features/workout/windows-client'
import { getLocalDb, type LocalDb } from './local-db'

const ROW_KEY = 'windows'

export type LoadedWindows =
  | WindowsResult
  | { status: 'ok'; windows: ActivityWindows; fromCache: true }

let memoryWindows: ActivityWindows | null = null

async function withDb<T>(use: (db: LocalDb) => Promise<T>): Promise<T | undefined> {
  try {
    const db = await getLocalDb()
    return db ? await use(db) : undefined
  } catch {
    return undefined
  }
}

async function readCachedWindows(): Promise<ActivityWindows | null> {
  const row = await withDb((db) => db.programCache.get(ROW_KEY))
  return (row?.key === 'windows' ? row.windows : undefined) ?? memoryWindows
}

// A 200 refreshes the copy and a 401 deletes it; network, timeout and 5xx fall back to the copy.
export async function loadWindows(): Promise<LoadedWindows> {
  const result = await fetchWindows()
  if (result.status === 'ok') {
    memoryWindows = result.windows
    await withDb((db) =>
      db.programCache.put({ key: ROW_KEY, savedAtMs: Date.now(), windows: result.windows }),
    )
    return result
  }
  if (result.status === 'unauthenticated') {
    await clearCachedWindows()
    return result
  }
  const cached = await readCachedWindows()
  return cached ? { status: 'ok', windows: cached, fromCache: true } : result
}

export async function clearCachedWindows(): Promise<void> {
  memoryWindows = null
  await withDb((db) => db.programCache.delete(ROW_KEY))
}
