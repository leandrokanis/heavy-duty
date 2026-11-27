import type { CurrentPeriod } from '@/features/period/period.types'
import { fetchCurrentPeriod, type PeriodResult } from '@/features/period/period-client'
import { getLocalDb, type LocalDb } from './local-db'

const ROW_KEY = 'period'

export type LoadedPeriod = PeriodResult | { status: 'ok'; period: CurrentPeriod; fromCache: true }

let memoryPeriod: CurrentPeriod | null = null

async function withDb<T>(use: (db: LocalDb) => Promise<T>): Promise<T | undefined> {
  try {
    const db = await getLocalDb()
    return db ? await use(db) : undefined
  } catch {
    return undefined
  }
}

async function readCachedPeriod(): Promise<CurrentPeriod | null> {
  const row = await withDb((db) => db.programCache.get(ROW_KEY))
  return (row?.key === 'period' ? row.period : undefined) ?? memoryPeriod
}

export async function storePeriod(period: CurrentPeriod): Promise<void> {
  memoryPeriod = period
  await withDb((db) => db.programCache.put({ key: ROW_KEY, savedAtMs: Date.now(), period }))
}

// A 200 refreshes the copy and a 401 deletes it; network, timeout and 5xx fall back to the copy.
export async function loadPeriod(): Promise<LoadedPeriod> {
  const result = await fetchCurrentPeriod()
  if (result.status === 'ok') {
    await storePeriod(result.period)
    return result
  }
  if (result.status === 'unauthenticated') {
    await clearCachedPeriod()
    return result
  }
  const cached = await readCachedPeriod()
  return cached ? { status: 'ok', period: cached, fromCache: true } : result
}

export async function clearCachedPeriod(): Promise<void> {
  memoryPeriod = null
  await withDb((db) => db.programCache.delete(ROW_KEY))
}
