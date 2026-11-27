import type { Medal, Medals } from '@/features/medals/medals.types'
import { fetchMedals, type MedalsResult } from '@/features/medals/medals-client'
import { getLocalDb, type LocalDb } from './local-db'

const ROW_KEY = 'medals'

export type LoadedMedals =
  | { status: 'ok'; medals: Medals; awardedNow: Medal[]; fromCache?: true }
  | Exclude<MedalsResult, { status: 'ok' }>

let memoryMedals: Medals | null = null

async function withDb<T>(use: (db: LocalDb) => Promise<T>): Promise<T | undefined> {
  try {
    const db = await getLocalDb()
    return db ? await use(db) : undefined
  } catch {
    return undefined
  }
}

async function readCachedMedals(): Promise<Medals | null> {
  const row = await withDb((db) => db.programCache.get(ROW_KEY))
  return (row?.key === 'medals' ? row.medals : undefined) ?? memoryMedals
}

// The medals the API awarded since the copy on the device; none on the first read, so an app
// opened for the first time shows no medal from the past drop from the top (D104).
function awardedSince(previous: Medals | null, current: Medals): Medal[] {
  if (previous === null) return []
  const before = new Set(
    previous.medals.filter(({ awardedAt }) => awardedAt !== null).map(({ code }) => code),
  )
  return current.medals.filter(({ code, awardedAt }) => awardedAt !== null && !before.has(code))
}

// A 200 refreshes the copy and a 401 deletes it; network, timeout and 5xx fall back to the copy.
export async function loadMedals(): Promise<LoadedMedals> {
  const previous = await readCachedMedals()
  const result = await fetchMedals()
  if (result.status === 'ok') {
    memoryMedals = result.medals
    await withDb((db) =>
      db.programCache.put({ key: ROW_KEY, savedAtMs: Date.now(), medals: result.medals }),
    )
    return { ...result, awardedNow: awardedSince(previous, result.medals) }
  }
  if (result.status === 'unauthenticated') {
    await clearCachedMedals()
    return result
  }
  return previous ? { status: 'ok', medals: previous, awardedNow: [], fromCache: true } : result
}

export async function clearCachedMedals(): Promise<void> {
  memoryMedals = null
  await withDb((db) => db.programCache.delete(ROW_KEY))
}
