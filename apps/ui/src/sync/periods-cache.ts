import type { PeriodList } from '@/features/period/period.types'
import { fetchPeriods, type PeriodListResult } from '@/features/period/period-client'
import { getLocalDb, type LocalDb } from './local-db'

const ROW_KEY = 'periods'

export type LoadedPeriods = PeriodListResult | { status: 'ok'; list: PeriodList; fromCache: true }

let memoryList: PeriodList | null = null

async function withDb<T>(use: (db: LocalDb) => Promise<T>): Promise<T | undefined> {
  try {
    const db = await getLocalDb()
    return db ? await use(db) : undefined
  } catch {
    return undefined
  }
}

async function readCachedPeriods(): Promise<PeriodList | null> {
  const row = await withDb((db) => db.programCache.get(ROW_KEY))
  return (row?.key === 'periods' ? row.list : undefined) ?? memoryList
}

// A 200 refreshes the copy and a 401 deletes it; network, timeout and 5xx fall back to the copy.
export async function loadPeriods(): Promise<LoadedPeriods> {
  const result = await fetchPeriods()
  if (result.status === 'ok') {
    memoryList = result.list
    await withDb((db) =>
      db.programCache.put({ key: ROW_KEY, savedAtMs: Date.now(), list: result.list }),
    )
    return result
  }
  if (result.status === 'unauthenticated') {
    await clearCachedPeriods()
    return result
  }
  const cached = await readCachedPeriods()
  return cached ? { status: 'ok', list: cached, fromCache: true } : result
}

export async function clearCachedPeriods(): Promise<void> {
  memoryList = null
  await withDb((db) => db.programCache.delete(ROW_KEY))
}
