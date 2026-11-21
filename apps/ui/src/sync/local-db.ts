import Dexie, { type Table } from 'dexie'
import type { ActiveWorkoutRow, PendingSet, ProgramCacheRow, RejectedSet } from './sync.types'

export const LOCAL_DB_NAME = 'heavy-duty'

// Schema of docs/arquitetura/armazenamento-local.md; a version bump needs its own migration.
export class LocalDb extends Dexie {
  pendingSets!: Table<PendingSet, number>
  rejectedSets!: Table<RejectedSet, string>
  activeWorkout!: Table<ActiveWorkoutRow, string>
  programCache!: Table<ProgramCacheRow, string>

  constructor(name: string = LOCAL_DB_NAME) {
    super(name)
    this.version(1).stores({
      pendingSets: '++seq, &id',
      rejectedSets: 'id',
      activeWorkout: 'key',
      programCache: 'key',
    })
  }
}

// Null when IndexedDB is missing or blocked (private mode, full quota): the caller falls back to memory.
export async function openLocalDb(name?: string): Promise<LocalDb | null> {
  try {
    const db = new LocalDb(name)
    await db.open()
    return db
  } catch {
    return null
  }
}

let shared: Promise<LocalDb | null> | null = null

// The one database of the page; null (not retried) when IndexedDB is missing or blocked.
export function getLocalDb(): Promise<LocalDb | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  shared ??= openLocalDb()
  return shared
}
