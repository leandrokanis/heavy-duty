import { weekStartOf } from '@/features/workout/week'
import type { WeekWindows } from '@/features/workout/weekly-windows.types'
import { fetchWeekWindows, type WeekWindowsResult } from '@/features/workout/weekly-windows-client'
import { getLocalDb, type LocalDb } from './local-db'

const ROW_KEY = 'weekWindows'

export type LoadedWeekWindows =
  | WeekWindowsResult
  | { status: 'ok'; week: WeekWindows; fromCache: true }

let memoryWeek: WeekWindows | null = null

async function withDb<T>(use: (db: LocalDb) => Promise<T>): Promise<T | undefined> {
  try {
    const db = await getLocalDb()
    return db ? await use(db) : undefined
  } catch {
    return undefined
  }
}

async function readCachedWeek(): Promise<WeekWindows | null> {
  const row = await withDb((db) => db.programCache.get(ROW_KEY))
  return (row?.key === 'weekWindows' ? row.week : undefined) ?? memoryWeek
}

// The phone has no outcome of the windows, so with no signal only the copy of the same week
// counts, with no provisional value (D77). A 401 deletes the copy.
export async function loadWeekWindows(nowMs: number = Date.now()): Promise<LoadedWeekWindows> {
  const from = new Date(weekStartOf(nowMs)).toISOString()
  const result = await fetchWeekWindows(from)
  if (result.status === 'ok') {
    memoryWeek = result.week
    await withDb((db) =>
      db.programCache.put({ key: ROW_KEY, savedAtMs: Date.now(), week: result.week }),
    )
    return result
  }
  if (result.status === 'unauthenticated') {
    await clearCachedWeekWindows()
    return result
  }
  const cached = await readCachedWeek()
  return cached && Date.parse(cached.from) === Date.parse(from)
    ? { status: 'ok', week: cached, fromCache: true }
    : result
}

export async function clearCachedWeekWindows(): Promise<void> {
  memoryWeek = null
  await withDb((db) => db.programCache.delete(ROW_KEY))
}
