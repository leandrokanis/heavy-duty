import type { Today } from '@/features/workout/today.types'
import { fetchToday, type TodayResult } from '@/features/workout/today-client'
import { getLocalDb, type LocalDb } from './local-db'

const ROW_KEY = 'today'

export type LoadedToday = TodayResult | { status: 'ok'; today: Today; fromCache: true }

let memoryToday: Today | null = null

async function withDb<T>(use: (db: LocalDb) => Promise<T>): Promise<T | undefined> {
  try {
    const db = await getLocalDb()
    return db ? await use(db) : undefined
  } catch {
    return undefined
  }
}

async function readCachedToday(): Promise<Today | null> {
  const row = await withDb((db) => db.programCache.get(ROW_KEY))
  return row?.today ?? memoryToday
}

// A 200 refreshes the copy and a 401 deletes it; network, timeout and 5xx fall back to the copy (FR-012).
export async function loadToday(): Promise<LoadedToday> {
  const result = await fetchToday()
  if (result.status === 'ok') {
    memoryToday = result.today
    await withDb((db) =>
      db.programCache.put({ key: ROW_KEY, savedAtMs: Date.now(), today: result.today }),
    )
    return result
  }
  if (result.status === 'unauthenticated') {
    await clearCachedToday()
    return result
  }
  const cached = await readCachedToday()
  return cached ? { status: 'ok', today: cached, fromCache: true } : result
}

export async function hasCachedToday(): Promise<boolean> {
  return (await readCachedToday()) !== null
}

export async function clearCachedToday(): Promise<void> {
  memoryToday = null
  await withDb((db) => db.programCache.delete(ROW_KEY))
}
